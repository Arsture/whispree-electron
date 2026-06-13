import { describe, expect, it } from 'vitest';
import { MockHotkeyAdapter, PlannedAudioCaptureAdapter } from './adapters/mock-adapters';
import { MockDictationPipeline } from './mock-pipeline';
import { RecordingController } from './recording-controller';

const immediateDelay = () => Promise.resolve();

describe('RecordingController', () => {
  it('toggles mock recording through the hotkey adapter', async () => {
    const hotkey = new MockHotkeyAdapter();
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);
    const controller = new RecordingController({ pipeline, hotkeyAdapter: hotkey, shortcut: '⌃⇧R' });

    await controller.register();
    expect(hotkey.trigger('⌃⇧R')).toBe(true);
    expect(pipeline.getSnapshot().recording.active || pipeline.getSnapshot().queue.processingCount > 0).toBe(true);
    await pipeline.whenIdle();
    expect(pipeline.getSnapshot().history).toHaveLength(1);
  });

  it('surfaces audio adapter failures without corrupting the queue', async () => {
    const failingAudio = new PlannedAudioCaptureAdapter('macos', 'planned', 'not implemented');
    const pipeline = new MockDictationPipeline(undefined, immediateDelay, { audio: failingAudio });

    pipeline.enqueueMockDictation();
    await pipeline.whenIdle();

    expect(pipeline.getSnapshot().recording.active).toBe(false);
    expect(pipeline.getSnapshot().currentError?.message).toContain('macos audio capture adapter is planned');
    expect(pipeline.getSnapshot().queue.totalCount).toBe(0);
  });
});
