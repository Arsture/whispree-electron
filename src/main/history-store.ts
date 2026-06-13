import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HistoryRecordSnapshot } from '../shared/ipc';

const historyRetentionLimit = 100;

export class FileHistoryStore {
  readonly #historyFile: string;
  #records: HistoryRecordSnapshot[] = [];
  #lastError: string | null = null;

  constructor(historyFile: string) {
    this.#historyFile = historyFile;
  }

  get records(): readonly HistoryRecordSnapshot[] {
    return [...this.#records];
  }

  get lastError(): string | null {
    return this.#lastError;
  }

  async load(): Promise<readonly HistoryRecordSnapshot[]> {
    try {
      const text = await readFile(this.#historyFile, 'utf8');
      const parsed = JSON.parse(text) as unknown;
      this.#records = capHistoryRecords(Array.isArray(parsed) ? parsed.filter(isHistoryRecord) : []);
      this.#lastError = null;
    } catch (error) {
      this.#records = [];
      this.#lastError = isFileMissing(error) ? null : error instanceof Error ? error.message : String(error);
    }
    return this.records;
  }

  async append(record: HistoryRecordSnapshot): Promise<readonly HistoryRecordSnapshot[]> {
    this.#records = capHistoryRecords([record, ...this.#records.filter((candidate) => candidate.id !== record.id)]);
    await this.#persist();
    this.#lastError = null;
    return this.records;
  }

  async clear(): Promise<void> {
    this.#records = [];
    await this.#persist();
    this.#lastError = null;
  }

  async #persist(): Promise<void> {
    await mkdir(path.dirname(this.#historyFile), { recursive: true });
    const tmpFile = `${this.#historyFile}.tmp`;
    await writeFile(tmpFile, `${JSON.stringify(this.#records, null, 2)}\n`, 'utf8');
    await rename(tmpFile, this.#historyFile);
  }
}

export function createHistoryStore(userDataPath: string): FileHistoryStore {
  return new FileHistoryStore(path.join(userDataPath, 'history.json'));
}

function capHistoryRecords(records: readonly HistoryRecordSnapshot[]): HistoryRecordSnapshot[] {
  return records.slice(0, historyRetentionLimit);
}

function isHistoryRecord(value: unknown): value is HistoryRecordSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.sequence === 'number' && typeof record.originalText === 'string' && typeof record.correctedText === 'string' && typeof record.deliveredAtIso === 'string';
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
