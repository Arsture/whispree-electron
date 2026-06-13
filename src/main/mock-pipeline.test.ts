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



  it('records clipboard fallback status when insertion adapter cannot insert', async () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay, {
      textInsertion: {
        descriptor: {
          id: 'test-clipboard',
          label: 'Test clipboard fallback',
          platform: 'cross-platform',
          status: 'mock',
          detail: 'test',
        },
        insertText: async () => 'copied-to-clipboard' as const,
      },
    });

    pipeline.enqueueMockDictation({ recordingDelayMs: 0, sttDelayMs: 0, llmDelayMs: 0, deliveryDelayMs: 0 });
    await pipeline.whenIdle();

    expect(pipeline.getSnapshot().history[0]).toMatchObject({ status: 'copied-to-clipboard' });
    expect(pipeline.getSnapshot().queue.items[0]).toMatchObject({ status: 'copied-to-clipboard', isTerminal: true });
  });

  it('accepts captured real audio bytes and runs them through the provider router', async () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);

    const recording = pipeline.startRealRecording({ mimeType: 'audio/webm' });
    expect(recording.recording).toMatchObject({ active: true, mode: 'real' });

    pipeline.submitRecordedAudio({
      bytes: new Uint8Array([1, 2, 3]).buffer,
      mimeType: 'audio/webm',
      durationMs: 50,
    });
    await pipeline.whenIdle();

    const snapshot = pipeline.getSnapshot();
    expect(snapshot.recording.mode).toBe('real');
    expect(snapshot.history[0]?.status).toBe('delivered');
    expect(snapshot.queue.items[0]?.id).toBe('history-1');
  });

  it('updates permission cards after the runtime permission adapter responds', () => {
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);

    pipeline.updatePermission('microphone', 'granted');

    expect(pipeline.getSnapshot().permissions.find((permission) => permission.kind === 'microphone')).toMatchObject({
      state: 'granted',
      status: 'implemented',
    });
  });


  it('hydrates persisted history and appends new deliveries through the history store', async () => {
    const appended: unknown[] = [];
    const pipeline = new MockDictationPipeline(undefined, immediateDelay, {
      initialHistory: [
        {
          id: 'history-99',
          sequence: 99,
          originalText: 'previous raw',
          correctedText: 'previous corrected',
          deliveredAtIso: new Date(0).toISOString(),
          status: 'delivered',
        },
      ],
      historyStore: {
        append: async (record) => {
          appended.push(record);
          return appended;
        },
      },
    });

    expect(pipeline.getSnapshot().history[0]?.id).toBe('history-99');

    pipeline.enqueueMockDictation({ recordingDelayMs: 0, sttDelayMs: 0, llmDelayMs: 0, deliveryDelayMs: 0 });
    await pipeline.whenIdle();

    expect(appended).toHaveLength(1);
    expect(pipeline.getSnapshot().history[0]?.id).toBe('history-1');
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
