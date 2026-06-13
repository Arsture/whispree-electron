import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HistoryRecordSnapshot } from '../shared/ipc';

export class FileHistoryStore {
  readonly #historyFile: string;
  #records: HistoryRecordSnapshot[] = [];

  constructor(historyFile: string) {
    this.#historyFile = historyFile;
  }

  get records(): readonly HistoryRecordSnapshot[] {
    return [...this.#records];
  }

  async load(): Promise<readonly HistoryRecordSnapshot[]> {
    try {
      const text = await readFile(this.#historyFile, 'utf8');
      const parsed = JSON.parse(text) as unknown;
      this.#records = Array.isArray(parsed) ? parsed.filter(isHistoryRecord) : [];
    } catch (error) {
      if (!isFileMissing(error)) throw error;
      this.#records = [];
    }
    return this.records;
  }

  async append(record: HistoryRecordSnapshot): Promise<readonly HistoryRecordSnapshot[]> {
    this.#records = [record, ...this.#records.filter((candidate) => candidate.id !== record.id)];
    await this.#persist();
    return this.records;
  }

  async clear(): Promise<void> {
    this.#records = [];
    await this.#persist();
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

function isHistoryRecord(value: unknown): value is HistoryRecordSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.sequence === 'number' && typeof record.originalText === 'string' && typeof record.correctedText === 'string' && typeof record.deliveredAtIso === 'string';
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
