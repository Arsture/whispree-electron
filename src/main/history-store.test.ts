import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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


  it('caps persisted history at Swift parity limit of 100 newest records', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'whispree-history-'));
    const file = path.join(dir, 'history.json');
    const store = new FileHistoryStore(file);
    try {
      for (let index = 0; index < 105; index += 1) {
        await store.append({ ...record, id: `history-${index}`, sequence: index, originalText: `raw-${index}` });
      }
      const persisted = JSON.parse(await readFile(file, 'utf8')) as typeof record[];
      expect(persisted).toHaveLength(100);
      expect(persisted[0]?.id).toBe('history-104');
      expect(persisted.at(-1)?.id).toBe('history-5');

      const overfull = Array.from({ length: 120 }, (_, index) => ({ ...record, id: `old-${index}`, sequence: index }));
      await writeFile(file, `${JSON.stringify(overfull)}\n`, 'utf8');
      const reloaded = new FileHistoryStore(file);
      await expect(reloaded.load()).resolves.toHaveLength(100);
      expect(reloaded.records.at(-1)?.id).toBe('old-99');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('falls back to empty history on corrupt JSON with a visible local error', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'whispree-history-'));
    const file = path.join(dir, 'history.json');
    const store = new FileHistoryStore(file);
    try {
      await writeFile(file, '{bad history', 'utf8');
      await expect(store.load()).resolves.toEqual([]);
      expect(store.lastError).toContain('JSON');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
