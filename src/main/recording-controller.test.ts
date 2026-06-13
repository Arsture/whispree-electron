import { describe, expect, it } from 'vitest';
import { MockHotkeyAdapter, PlannedAudioCaptureAdapter } from './adapters/mock-adapters';
import { MockDictationPipeline } from './mock-pipeline';
import { RecordingController } from './recording-controller';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';

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

  it('prefers the renderer real-recording bridge over mock enqueue for the global hotkey', async () => {
    const hotkey = new MockHotkeyAdapter();
    const calls: string[] = [];
    const settings: AppSettingsSnapshot = { ...defaultAppSettings, recordingMode: 'toggle' };
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);
    const controller = new RecordingController({
      pipeline,
      hotkeyAdapter: hotkey,
      shortcut: '⌃⇧R',
      settingsProvider: () => settings,
      realRecordingBridge: {
        startRealRecording: () => calls.push('start-real-recording'),
        stopRealRecording: () => calls.push('stop-real-recording'),
      },
    });

    await controller.register();
    hotkey.trigger('⌃⇧R');

    expect(calls).toEqual(['start-real-recording']);
    expect(pipeline.getSnapshot().queue.totalCount).toBe(0);
  });

  it('uses toggle mode to stop an active real recording instead of canceling foreground work', () => {
    const calls: string[] = [];
    const settings: AppSettingsSnapshot = { ...defaultAppSettings, recordingMode: 'toggle' };
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);
    const controller = new RecordingController({
      pipeline,
      hotkeyAdapter: new MockHotkeyAdapter(),
      shortcut: '⌃⇧R',
      settingsProvider: () => settings,
      realRecordingBridge: {
        startRealRecording: () => calls.push('start-real-recording'),
        stopRealRecording: () => calls.push('stop-real-recording'),
      },
    });

    pipeline.startRealRecording({ mimeType: 'audio/webm' });
    controller.handleShortcutPressed();

    expect(calls).toEqual(['stop-real-recording']);
    expect(pipeline.getSnapshot().recording.active).toBe(true);
  });

  it('uses push-to-talk release as the stop edge and ignores repeated press while recording', () => {
    const calls: string[] = [];
    const settings: AppSettingsSnapshot = { ...defaultAppSettings, recordingMode: 'push-to-talk' };
    const pipeline = new MockDictationPipeline(undefined, immediateDelay);
    const controller = new RecordingController({
      pipeline,
      hotkeyAdapter: new MockHotkeyAdapter(),
      shortcut: '⌃⇧R',
      settingsProvider: () => settings,
      realRecordingBridge: {
        startRealRecording: () => calls.push('start-real-recording'),
        stopRealRecording: () => calls.push('stop-real-recording'),
      },
    });

    pipeline.startRealRecording({ mimeType: 'audio/webm' });
    controller.handleShortcutPressed();
    controller.handleShortcutReleased();

    expect(calls).toEqual(['stop-real-recording']);
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
