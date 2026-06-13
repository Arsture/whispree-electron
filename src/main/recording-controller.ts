import type { HotkeyAdapter } from '../shared/adapters';
import type { AppSnapshot } from '../shared/ipc';
import type { MockDictationPipeline } from './mock-pipeline';

export class RecordingController {
  readonly #pipeline: MockDictationPipeline;
  readonly #hotkeyAdapter: HotkeyAdapter;
  readonly #shortcut: string;
  #registered = false;

  constructor({
    pipeline,
    hotkeyAdapter,
    shortcut,
  }: {
    readonly pipeline: MockDictationPipeline;
    readonly hotkeyAdapter: HotkeyAdapter;
    readonly shortcut: string;
  }) {
    this.#pipeline = pipeline;
    this.#hotkeyAdapter = hotkeyAdapter;
    this.#shortcut = shortcut;
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
    const snapshot = this.#pipeline.getSnapshot();
    if (snapshot.recording.active || snapshot.queue.foregroundJobSequence !== null) {
      return this.#pipeline.cancelForegroundJob();
    }
    return this.#pipeline.enqueueMockDictation();
  }
}
