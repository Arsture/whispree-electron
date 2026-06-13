import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileHistoryStore } from './history-store';

const record = {
  id: 'history-1',
  sequence: 1,
  originalText: 'hello',
  correctedText: 'hello Whispree',
  deliveredAtIso: new Date(0).toISOString(),
  status: 'delivered' as const,
};

describe('FileHistoryStore', () => {
  it('loads empty history when the file is missing and persists appended records', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'whispree-history-'));
    const file = path.join(dir, 'history.json');
    const store = new FileHistoryStore(file);
    try {
      await expect(store.load()).resolves.toEqual([]);
      await store.append(record);
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual([record]);
      const second = new FileHistoryStore(file);
      await expect(second.load()).resolves.toEqual([record]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
