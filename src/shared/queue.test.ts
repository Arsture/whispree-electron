import { describe, expect, it } from 'vitest';
import { DictationQueueState, type DictationJobSnapshot } from './queue';

function snapshot(overrides: Partial<DictationJobSnapshot> = {}): DictationJobSnapshot {
  return {
    sttProviderType: 'mock',
    llmProviderType: 'mock',
    llmEnabled: true,
    correctionMode: 'standard',
    customPrompt: null,
    language: 'ko',
    glossary: [],
    domainWordSets: [],
    correctionMappings: [],
    screenshotContextEnabled: false,
    screenshotPasteEnabled: false,
    vadEnabled: true,
    ...overrides,
  };
}

describe('DictationQueueState', () => {
  it('enqueues immutable job snapshots with sequence metadata', () => {
    const queue = new DictationQueueState();
    const mutableGlossary = ['Whispree'];
    const first = queue.enqueue({ snapshot: snapshot({ glossary: mutableGlossary }) });
    mutableGlossary.push('mutated-after-enqueue');
    const stored = queue.getJob(first.id);

    expect(first.sequence).toBe(1);
    expect(stored?.snapshot.glossary).toEqual(['Whispree']);
    expect(queue.jobs[0]?.sequence).toBe(1);
  });

  it('holds later ready jobs until the earlier non-terminal head is done', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    const second = queue.enqueue({ snapshot: snapshot() });

    queue.transitionJob(second.id, 'ready-for-delivery', {
      transcribedText: 'second',
      correctedText: 'second corrected',
    });

    expect(queue.nextDeliverableJob()).toBeNull();
    queue.transitionJob(first.id, 'ready-for-delivery', {
      transcribedText: 'first',
      correctedText: 'first corrected',
    });
    expect(queue.nextDeliverableJob()?.id).toBe(first.id);
  });

  it('lets failed/canceled/skipped terminal head jobs unblock later ready jobs', () => {
    const terminalStates = ['failed', 'canceled', 'skipped'] as const;

    for (const terminalState of terminalStates) {
      const queue = new DictationQueueState();
      const first = queue.enqueue({ snapshot: snapshot() });
      const second = queue.enqueue({ snapshot: snapshot() });
      queue.transitionJob(second.id, 'ready-for-delivery');
      queue.transitionJob(first.id, terminalState, { error: terminalState });

      expect(queue.nextDeliverableJob()?.id).toBe(second.id);
    }
  });



  it('allows screenshot selection only for the FIFO delivery head', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    const second = queue.enqueue({ snapshot: snapshot() });
    queue.transitionJob(second.id, 'ready-for-delivery');

    expect(() => queue.beginScreenshotSelection(second.id)).toThrow(/FIFO delivery head/);
    queue.transitionJob(first.id, 'ready-for-delivery');
    expect(queue.beginScreenshotSelection(first.id).status).toBe('awaiting-screenshot-selection');
    expect(queue.completeScreenshotSelection(first.id, ['shot-1']).selectedImageIds).toEqual(['shot-1']);
  });

  it('blocks delivery while recording is active', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    queue.transitionJob(first.id, 'ready-for-delivery');

    queue.setRecordingActive(true);
    expect(queue.nextDeliverableJob()).toBeNull();

    queue.setRecordingActive(false);
    expect(queue.nextDeliverableJob()?.id).toBe(first.id);
  });

  it('projects recording, processing, ready, terminal, and foreground counts', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    const second = queue.enqueue({ snapshot: snapshot() });
    const third = queue.enqueue({ snapshot: snapshot() });

    queue.transitionJob(first.id, 'transcribing');
    queue.transitionJob(second.id, 'ready-for-delivery');
    queue.transitionJob(third.id, 'canceled');
    queue.setRecordingActive(true);

    expect(queue.snapshot()).toMatchObject({
      totalCount: 3,
      processingCount: 1,
      deliveryReadyCount: 1,
      terminalCount: 1,
      isRecordingActive: true,
      foregroundJobSequence: 1,
    });
  });

  it('scoped cancel affects only the foreground job', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    const second = queue.enqueue({ snapshot: snapshot() });
    queue.transitionJob(first.id, 'transcribing');
    queue.transitionJob(second.id, 'ready-for-delivery');

    const canceled = queue.cancelForegroundJob();

    expect(canceled?.id).toBe(first.id);
    expect(queue.getJob(first.id)?.status).toBe('canceled');
    expect(queue.getJob(second.id)?.status).toBe('ready-for-delivery');
    expect(queue.nextDeliverableJob()?.id).toBe(second.id);
  });

  it('does not resurrect terminal jobs after late provider completion', () => {
    const queue = new DictationQueueState();
    const first = queue.enqueue({ snapshot: snapshot() });
    queue.transitionJob(first.id, 'canceled');

    expect(() => queue.transitionJob(first.id, 'ready-for-delivery')).toThrow(/Cannot resurrect/);
  });
});
