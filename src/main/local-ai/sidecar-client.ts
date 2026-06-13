import type { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { SidecarRequest, SidecarResponse } from '../../shared/sidecar-protocol';

export type SidecarClientRequest = SidecarRequest extends infer Request
  ? Request extends SidecarRequest
    ? Omit<Request, 'id' | 'protocolVersion'>
    : never
  : never;
import { isSidecarResponse } from '../../shared/sidecar-protocol';

export interface JsonLineSidecarTransport {
  readonly events: EventEmitter;
  writeLine(line: string): void;
  dispose(): void;
}

export interface SidecarClientOptions {
  readonly timeoutMs?: number;
  readonly idFactory?: () => string;
}

export class SidecarClient {
  readonly #transport: JsonLineSidecarTransport;
  readonly #timeoutMs: number;
  readonly #idFactory: () => string;
  readonly #pending = new Map<string, { readonly resolve: (response: SidecarResponse) => void; readonly reject: (error: Error) => void; readonly timer: ReturnType<typeof setTimeout> }>();
  #buffer = '';

  constructor(transport: JsonLineSidecarTransport, options: SidecarClientOptions = {}) {
    this.#transport = transport;
    this.#timeoutMs = options.timeoutMs ?? 30000;
    this.#idFactory = options.idFactory ?? randomUUID;
    this.#transport.events.on('line', (line) => this.#handleLine(String(line)));
    this.#transport.events.on('data', (chunk) => this.#handleData(String(chunk)));
    this.#transport.events.on('error', (error) => this.#rejectAll(error instanceof Error ? error : new Error(String(error))));
    this.#transport.events.on('close', () => this.#rejectAll(new Error('Sidecar transport closed.')));
  }

  async request(request: SidecarClientRequest): Promise<SidecarResponse> {
    const envelope = { ...request, id: this.#idFactory(), protocolVersion: 1 } as SidecarRequest;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(envelope.id);
        reject(new Error(`Sidecar request timed out: ${envelope.type}`));
      }, this.#timeoutMs);
      this.#pending.set(envelope.id, { resolve, reject, timer });
      this.#transport.writeLine(JSON.stringify(envelope));
    });
  }

  dispose(): void {
    this.#rejectAll(new Error('Sidecar client disposed.'));
    this.#transport.dispose();
  }

  #handleData(chunk: string): void {
    this.#buffer += chunk;
    let newline = this.#buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.#buffer.slice(0, newline).trim();
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line) this.#handleLine(line);
      newline = this.#buffer.indexOf('\n');
    }
  }

  #handleLine(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.#rejectAll(new Error(`Malformed sidecar JSON: ${line.slice(0, 120)}`));
      return;
    }
    if (!isSidecarResponse(parsed)) {
      this.#rejectAll(new Error('Invalid sidecar response envelope.'));
      return;
    }
    if (parsed.type === 'progress') return;
    const pending = this.#pending.get(parsed.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.#pending.delete(parsed.id);
    if (parsed.type === 'error') pending.reject(new Error(parsed.message));
    else pending.resolve(parsed);
  }

  #rejectAll(error: Error): void {
    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.#pending.delete(id);
    }
  }
}
