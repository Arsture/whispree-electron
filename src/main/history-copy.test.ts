import { describe, expect, it, vi } from 'vitest';
import { initialAppSnapshot } from '../shared/ipc';
import { copyHistoryTextFromSnapshot } from './history-copy';

const snapshot = {
  ...initialAppSnapshot,
  history: [
    {
      id: 'history-1',
      sequence: 1,
      originalText: 'raw text',
      correctedText: 'corrected text',
      deliveredAtIso: new Date(0).toISOString(),
      status: 'delivered' as const,
    },
  ],
};

describe('copyHistoryTextFromSnapshot', () => {
  it('writes selected history text through the main-owned clipboard boundary', () => {
    const writeText = vi.fn();

    const result = copyHistoryTextFromSnapshot(snapshot, 'history-1', 'corrected', { writeText });

    expect(result.ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('corrected text');
  });

  it('rejects invalid copy requests without touching the clipboard', () => {
    const writeText = vi.fn();

    const result = copyHistoryTextFromSnapshot(snapshot, 'history-1', 'bad', { writeText });

    expect(result.ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports clipboard writer failures', () => {
    const result = copyHistoryTextFromSnapshot(snapshot, 'history-1', 'original', {
      writeText: () => {
        throw new Error('clipboard unavailable');
      },
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported', message: 'clipboard unavailable' } });
  });
});
