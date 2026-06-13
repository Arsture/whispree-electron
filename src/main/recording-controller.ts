import type { HotkeyAdapter } from '../shared/adapters';
import type { AppSnapshot } from '../shared/ipc';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';
import type { MockDictationPipeline } from './mock-pipeline';

export interface RealRecordingBridge {
  startRealRecording(): void;
  stopRealRecording(): void;
}

export class RecordingController {
  readonly #pipeline: MockDictationPipeline;
  readonly #hotkeyAdapter: HotkeyAdapter;
  readonly #settingsProvider: () => AppSettingsSnapshot;
  readonly #realRecordingBridge: RealRecordingBridge | null;
  readonly #shortcut: string;
  #registered = false;

  constructor({
    pipeline,
    hotkeyAdapter,
    shortcut,
    settingsProvider,
    realRecordingBridge = null,
  }: {
    readonly pipeline: MockDictationPipeline;
    readonly hotkeyAdapter: HotkeyAdapter;
    readonly shortcut: string;
    readonly settingsProvider?: () => AppSettingsSnapshot;
    readonly realRecordingBridge?: RealRecordingBridge | null;
  }) {
    this.#pipeline = pipeline;
    this.#hotkeyAdapter = hotkeyAdapter;
    this.#shortcut = shortcut;
    this.#settingsProvider = settingsProvider ?? (() => defaultAppSettings);
    this.#realRecordingBridge = realRecordingBridge;
  }

  async register(): Promise<void> {
    if (this.#registered) return;
    await this.#hotkeyAdapter.register(this.#shortcut, () => {
      this.toggleRecording();
    });
    this.#registered = true;
  }

  async unregister(): Promise<void> {
    if (!this.#registered) return;
    await this.#hotkeyAdapter.unregister(this.#shortcut);
    this.#registered = false;
  }

  toggleRecording(): AppSnapshot {
    return this.handleShortcutPressed();
  }

  handleShortcutPressed(): AppSnapshot {
    const snapshot = this.#pipeline.getSnapshot();
    const mode = this.#settingsProvider().recordingMode;
    if (snapshot.recording.active) {
      if (mode === 'toggle') return this.#stopRealRecordingPreferred();
      return snapshot;
    }
    return this.#startRealRecordingPreferred();
  }

  handleShortcutReleased(): AppSnapshot {
    const snapshot = this.#pipeline.getSnapshot();
    if (!snapshot.recording.active) return snapshot;
    if (this.#settingsProvider().recordingMode !== 'push-to-talk') return snapshot;
    return this.#stopRealRecordingPreferred();
  }

  cancelForegroundScope(): AppSnapshot {
    return this.#pipeline.cancelForegroundJob();
  }

  #startRealRecordingPreferred(): AppSnapshot {
    if (this.#realRecordingBridge) {
      this.#realRecordingBridge.startRealRecording();
      return this.#pipeline.getSnapshot();
    }
    return this.#pipeline.enqueueMockDictation();
  }

  #stopRealRecordingPreferred(): AppSnapshot {
    if (this.#realRecordingBridge) {
      this.#realRecordingBridge.stopRealRecording();
      return this.#pipeline.getSnapshot();
    }
    return this.#pipeline.cancelForegroundJob();
  }
}
