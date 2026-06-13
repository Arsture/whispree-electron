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
      env: buildSidecarEnvironment(spec.env),
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

export function buildSidecarEnvironment(explicitEnv: Readonly<Record<string, string>> = {}): NodeJS.ProcessEnv {
  const allowedParentKeys = [
    'PATH',
    'SystemRoot',
    'WINDIR',
    'HOME',
    'USERPROFILE',
    'TMPDIR',
    'TEMP',
    'TMP',
    'PYTHONPATH',
    'VIRTUAL_ENV',
  ] as const;
  const env: NodeJS.ProcessEnv = {};
  for (const key of allowedParentKeys) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...explicitEnv };
}
