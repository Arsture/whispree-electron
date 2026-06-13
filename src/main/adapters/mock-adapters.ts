import type {
  AdapterDescriptor,
  AudioCaptureAdapter,
  BrowserContextAdapter,
  HotkeyAdapter,
  MediaPlaybackAdapter,
  PermissionAdapter,
  ScreenContextAdapter,
  TerminalContextAdapter,
  TextInsertionAdapter,
} from '../../shared/adapters';
import type { PermissionKind, PermissionState } from '../../shared/ipc';
import type { ImplementationStatus } from '../../shared/status';

type AdapterPlatform = AdapterDescriptor['platform'];

function descriptor(id: string, label: string, platform: AdapterPlatform, status: ImplementationStatus, detail: string): AdapterDescriptor {
  return { id, label, platform, status, detail };
}

export class StaticPermissionAdapter implements PermissionAdapter {
  readonly descriptor: AdapterDescriptor;
  readonly #state: PermissionState;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, state: PermissionState, detail: string) {
    this.descriptor = descriptor(`${platform}-permission`, `${platform} permission adapter`, platform, status, detail);
    this.#state = state;
  }

  async query(_kind: PermissionKind): Promise<PermissionState> {
    return this.#state;
  }

  async request(_kind: PermissionKind): Promise<PermissionState> {
    return this.#state;
  }

  async openSettings(_kind: PermissionKind): Promise<void> {
    // Settings opening is platform-specific and intentionally inert in shell adapters.
  }
}

export class MockHotkeyAdapter implements HotkeyAdapter {
  readonly descriptor = descriptor('mock-hotkey', 'Mock hotkey adapter', 'cross-platform', 'mock', 'In-process hotkey callback registry for tests.');
  readonly supportsKeyRelease: boolean;
  readonly #callbacks = new Map<string, { readonly pressed: () => void; readonly released?: () => void }>();

  constructor(options: { readonly supportsKeyRelease?: boolean } = {}) {
    this.supportsKeyRelease = options.supportsKeyRelease ?? true;
  }

  async register(shortcut: string, pressed: () => void, released?: () => void): Promise<void> {
    this.#callbacks.set(shortcut, { pressed, released });
  }

  async unregister(shortcut: string): Promise<void> {
    this.#callbacks.delete(shortcut);
  }

  trigger(shortcut: string): boolean {
    const callbacks = this.#callbacks.get(shortcut);
    if (!callbacks) return false;
    callbacks.pressed();
    return true;
  }

  release(shortcut: string): boolean {
    const callbacks = this.#callbacks.get(shortcut);
    if (!callbacks?.released || !this.supportsKeyRelease) return false;
    callbacks.released();
    return true;
  }
}

export class PlannedHotkeyAdapter implements HotkeyAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-hotkey`, `${platform} hotkey adapter`, platform, status, detail);
  }

  async register(_shortcut: string, _pressed: () => void, _released?: () => void): Promise<void> {
    throw new Error(`${this.descriptor.label} is ${this.descriptor.status}.`);
  }

  async unregister(_shortcut: string): Promise<void> {
    // Nothing was registered by planned shell adapters.
  }
}

export class MockAudioCaptureAdapter implements AudioCaptureAdapter {
  readonly descriptor = descriptor('mock-audio', 'Mock audio capture adapter', 'cross-platform', 'mock', 'Returns deterministic mock audio refs; no microphone access.');
  #active = false;

  async start(): Promise<void> {
    this.#active = true;
  }

  async stop(): Promise<{ readonly audioRef: string }> {
    this.#active = false;
    return { audioRef: 'mock-audio-ref' };
  }

  get active(): boolean {
    return this.#active;
  }
}

export class MockMediaPlaybackAdapter implements MediaPlaybackAdapter {
  readonly descriptor = descriptor('mock-media-playback', 'Mock media playback adapter', 'cross-platform', 'mock', 'Tracks pause/resume calls without controlling apps.');
  pauseCount = 0;
  resumeCount = 0;

  async pauseIfPlaying(): Promise<void> {
    this.pauseCount += 1;
  }

  async resumeIfPaused(): Promise<void> {
    this.resumeCount += 1;
  }
}

export class PlannedMediaPlaybackAdapter implements MediaPlaybackAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-media-playback`, `${platform} media playback adapter`, platform, status, detail);
  }

  async pauseIfPlaying(): Promise<void> {}

  async resumeIfPaused(): Promise<void> {}
}

export class PlannedAudioCaptureAdapter implements AudioCaptureAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-audio`, `${platform} audio capture adapter`, platform, status, detail);
  }

  async start(): Promise<void> {
    throw new Error(`${this.descriptor.label} is ${this.descriptor.status}.`);
  }

  async stop(): Promise<{ readonly audioRef: string }> {
    throw new Error(`${this.descriptor.label} is ${this.descriptor.status}.`);
  }
}

export class MockTextInsertionAdapter implements TextInsertionAdapter {
  readonly descriptor = descriptor('mock-text-insertion', 'Mock text insertion adapter', 'cross-platform', 'mock', 'Records insertions without touching clipboard or target apps.');
  readonly inserted: string[] = [];

  async insertText(text: string, _targetContextId: string | null): Promise<'inserted' | 'copied-to-clipboard'> {
    this.inserted.push(text);
    return 'inserted';
  }
}

export class ClipboardFallbackTextInsertionAdapter implements TextInsertionAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-text-insertion`, `${platform} text insertion adapter`, platform, status, detail);
  }

  async insertText(_text: string, _targetContextId: string | null): Promise<'inserted' | 'copied-to-clipboard'> {
    return 'copied-to-clipboard';
  }
}

export class MockScreenContextAdapter implements ScreenContextAdapter {
  readonly descriptor = descriptor('mock-screen-context', 'Mock screen context adapter', 'cross-platform', 'mock', 'Returns deterministic screenshot ids; no Screen Recording permission.');

  async startCapture(): Promise<void> {}

  async stopCapture(): Promise<readonly string[]> {
    return ['mock-screenshot'];
  }
}

export class PlannedScreenContextAdapter implements ScreenContextAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-screen-context`, `${platform} screen context adapter`, platform, status, detail);
  }

  async startCapture(): Promise<void> {
    throw new Error(`${this.descriptor.label} is ${this.descriptor.status}.`);
  }

  async stopCapture(): Promise<readonly string[]> {
    return [];
  }
}

export class StaticBrowserContextAdapter implements BrowserContextAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-browser-context`, `${platform} browser context adapter`, platform, status, detail);
  }

  async capture(): Promise<string | null> {
    return null;
  }

  async restore(_contextId: string): Promise<boolean> {
    return false;
  }
}

export class StaticTerminalContextAdapter implements TerminalContextAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(platform: AdapterPlatform, status: ImplementationStatus, detail: string) {
    this.descriptor = descriptor(`${platform}-terminal-context`, `${platform} terminal context adapter`, platform, status, detail);
  }

  async capture(): Promise<string | null> {
    return null;
  }

  async restore(_contextId: string): Promise<boolean> {
    return false;
  }
}
