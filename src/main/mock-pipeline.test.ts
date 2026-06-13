import { describe, expect, it } from 'vitest';
import { MockDictationPipeline } from './mock-pipeline';

const immediateDelay = () => Promise.resolve();

describe('MockDictationPipeline', () => {
  it('returns an initial snapshot with no jobs and adapter statuses', () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);

    expect(pipeline.getSnapshot()).toMatchObject({
      appStatus: 'ready',
      queue: { totalCount: 0, items: [] },
      currentError: null,
    });
    expect(pipeline.getSnapshot().providers.some((provider) => provider.status === 'mock')).toBe(true);
    expect(pipeline.getSnapshot().permissions.some((permission) => permission.status === 'planned')).toBe(true);
  });

  it('emits updates and records delivered mock history', async () => {
    const events: string[] = [];
    const pipeline = new MockDictationPipeline((snapshot) => {
      events.push(`${snapshot.appStatus}:${snapshot.queue.totalCount}:${snapshot.history.length}`);
    }, immediateDelay);

    pipeline.enqueueMockDictation({ glossary: ['Codex'] });
    await pipeline.whenIdle();
    const snapshot = pipeline.getSnapshot();

    expect(events.length).toBeGreaterThan(3);
    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.history[0]?.originalText).toContain('Codex');
    expect(snapshot.history[0]?.correctedText).toContain('[corrected:standard]');
    expect(snapshot.latest?.correctedText).toBe(snapshot.history[0]?.correctedText);
    expect(snapshot.currentError).toBeNull();
  });

  it('keeps delivery history FIFO even when later processing finishes first', async () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);

    pipeline.enqueueMockDictation({ sttDelayMs: 20, llmDelayMs: 20, recordingDelayMs: 0 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    pipeline.enqueueMockDictation({ sttDelayMs: 0, llmDelayMs: 0, recordingDelayMs: 0 });
    await pipeline.whenIdle();

    const deliveredSequences = [...pipeline.getSnapshot().history]
      .reverse()
      .map((record) => record.sequence);
    expect(deliveredSequences).toEqual([1, 2]);
  });

  it('canceling the active mock recording discards that recording without enqueueing a job', async () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);
    pipeline.enqueueMockDictation({ recordingDelayMs: 10, sttDelayMs: 0, llmDelayMs: 0 });
    const canceled = pipeline.cancelForegroundJob();

    expect(canceled.recording.active).toBe(false);
    await pipeline.whenIdle();
    expect(pipeline.getSnapshot().queue.items).toEqual([]);
    expect(pipeline.getSnapshot().history).toEqual([]);
  });

  it('surfaces async provider failures as failed jobs and visible error state', async () => {
    let calls = 0;
    const failingSecondDelay = () => {
      calls += 1;
      return calls === 2 ? Promise.reject(new Error('mock STT delay failed')) : Promise.resolve();
    };
    const pipeline = new MockDictationPipeline(undefined, failingSecondDelay);

    pipeline.enqueueMockDictation({ recordingDelayMs: 0, sttDelayMs: 0, llmDelayMs: 0 });
    await pipeline.whenIdle();
    const snapshot = pipeline.getSnapshot();

    expect(snapshot.currentError?.message).toBe('mock STT delay failed');
    expect(snapshot.queue.items).toHaveLength(1);
    expect(snapshot.queue.items[0]?.status).toBe('failed');
    expect(snapshot.queue.terminalCount).toBe(1);
    expect(snapshot.recording.active).toBe(false);
    expect(snapshot.history).toEqual([]);
  });
});
