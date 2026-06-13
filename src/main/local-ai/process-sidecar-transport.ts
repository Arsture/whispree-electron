import { EventEmitter } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { JsonLineSidecarTransport } from './sidecar-client';

export interface SidecarProcessSpec {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export class ProcessSidecarTransport implements JsonLineSidecarTransport {
  readonly events = new EventEmitter();
  readonly #child: ChildProcessWithoutNullStreams;

  constructor(spec: SidecarProcessSpec) {
    this.#child = spawn(spec.command, [...spec.args], {
      cwd: spec.cwd,
      env: spec.env ? { ...process.env, ...spec.env } : process.env,
      stdio: 'pipe',
    });
    this.#child.stdout.setEncoding('utf8');
    this.#child.stderr.setEncoding('utf8');
    this.#child.stdout.on('data', (chunk) => this.events.emit('data', chunk));
    this.#child.stderr.on('data', (chunk) => this.events.emit('stderr', String(chunk)));
    this.#child.on('error', (error) => this.events.emit('error', error));
    this.#child.on('close', (code, signal) => this.events.emit('close', { code, signal }));
  }

  writeLine(line: string): void {
    this.#child.stdin.write(`${line}\n`);
  }

  dispose(): void {
    this.#child.kill();
  }
}
