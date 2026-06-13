import { spawn } from 'node:child_process';
import type {
  AdapterDescriptor,
  AdapterPlatform,
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

export interface ElectronPermissionBridge {
  getMediaAccessStatus(mediaType: 'microphone' | 'camera' | 'screen'): 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
  askForMediaAccess?(mediaType: 'microphone' | 'camera'): Promise<boolean>;
  isTrustedAccessibilityClient?(prompt: boolean): boolean;
}

export interface ExternalUrlOpener {
  openExternal(url: string): Promise<unknown>;
}

export interface GlobalShortcutBridge {
  register(shortcut: string, callback: () => void): boolean;
  unregister(shortcut: string): void;
}

export interface NativeHotkeyHelperProcess {
  readonly stdout: { on(event: 'data', listener: (chunk: Buffer | string) => void): unknown };
  readonly stderr?: { on(event: 'data', listener: (chunk: Buffer | string) => void): unknown };
  on(event: 'exit' | 'error', listener: (...args: readonly unknown[]) => void): unknown;
  kill(signal?: NodeJS.Signals | number): unknown;
}

export type NativeHotkeyHelperLauncher = (command: string, args: readonly string[]) => NativeHotkeyHelperProcess;

export interface NativeHotkeyHelperOptions {
  readonly command: string;
  readonly args?: readonly string[];
  readonly launch?: NativeHotkeyHelperLauncher;
  readonly readyTimeoutMs?: number;
}

export interface ClipboardBridge {
  writeText(text: string): void;
  readText?(): string;
}

export type CommandRunner = (command: string, args: readonly string[]) => Promise<{ readonly ok: boolean; readonly stdout: string; readonly stderr: string }>;

const macSettingsLinks: Record<PermissionKind, string> = {
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  'screen-recording': 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  'browser-context': 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
  'terminal-context': 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
};


const windowsSettingsLinks: Record<PermissionKind, string> = {
  microphone: 'ms-settings:privacy-microphone',
  accessibility: 'ms-settings:easeofaccess-keyboard',
  'screen-recording': 'ms-settings:privacy-graphicsCaptureProgrammatic',
  'browser-context': 'ms-settings:defaultapps',
  'terminal-context': 'ms-settings:defaultapps',
};

const permissionDetails: Record<PermissionKind, string> = {
  microphone: 'Uses Electron systemPreferences media access APIs for microphone TCC state.',
  accessibility: 'Uses Electron systemPreferences accessibility trust prompt for paste/hotkey restoration.',
  'screen-recording': 'Uses Electron screen media status and System Settings deep-link because screen capture cannot be requested like microphone.',
  'browser-context': 'Automation access for browser context is user-granted in System Settings; no safe silent query exists.',
  'terminal-context': 'Automation access for terminal context is user-granted in System Settings; no safe silent query exists.',
};

function descriptor(id: string, label: string, platform: AdapterPlatform, status: ImplementationStatus, detail: string): AdapterDescriptor {
  return { id, label, platform, status, detail };
}

export class MacOSPermissionAdapter implements PermissionAdapter {
  readonly descriptor = descriptor('macos-permission', 'macOS permission adapter', 'macos', 'partial', 'Queries microphone/screen/accessibility through Electron and opens TCC panes for manual grants.');

  constructor(
    private readonly bridge: ElectronPermissionBridge,
    private readonly opener: ExternalUrlOpener,
  ) {}

  async query(kind: PermissionKind): Promise<PermissionState> {
    if (kind === 'microphone') return mediaStatusToPermissionState(this.bridge.getMediaAccessStatus('microphone'));
    if (kind === 'screen-recording') return mediaStatusToPermissionState(this.bridge.getMediaAccessStatus('screen'));
    if (kind === 'accessibility') return this.bridge.isTrustedAccessibilityClient?.(false) ? 'granted' : 'prompt-required';
    return 'prompt-required';
  }

  async request(kind: PermissionKind): Promise<PermissionState> {
    if (kind === 'microphone' && this.bridge.askForMediaAccess) {
      return (await this.bridge.askForMediaAccess('microphone')) ? 'granted' : await this.query(kind);
    }
    if (kind === 'accessibility') return this.bridge.isTrustedAccessibilityClient?.(true) ? 'granted' : 'prompt-required';
    await this.openSettings(kind);
    return this.query(kind);
  }

  async openSettings(kind: PermissionKind): Promise<void> {
    await this.opener.openExternal(macSettingsLinks[kind]);
  }

  detailFor(kind: PermissionKind): string {
    return permissionDetails[kind];
  }
}

export class WindowsPermissionAdapter implements PermissionAdapter {
  readonly descriptor = descriptor('windows-permission', 'Windows permission adapter', 'windows', 'partial', 'Queries Electron media access where available and opens Windows Settings URI panes for manual grants.');

  constructor(
    private readonly bridge: ElectronPermissionBridge | null = null,
    private readonly opener: ExternalUrlOpener | null = null,
  ) {}

  async query(kind: PermissionKind): Promise<PermissionState> {
    if (kind === 'microphone') return this.bridge ? mediaStatusToPermissionState(this.bridge.getMediaAccessStatus('microphone')) : 'prompt-required';
    if (kind === 'screen-recording') return this.bridge ? mediaStatusToPermissionState(this.bridge.getMediaAccessStatus('screen')) : 'manual-required';
    return 'manual-required';
  }

  async request(kind: PermissionKind): Promise<PermissionState> {
    if (kind === 'microphone' && this.bridge?.askForMediaAccess) {
      return (await this.bridge.askForMediaAccess('microphone')) ? 'granted' : await this.query(kind);
    }
    await this.openSettings(kind);
    return this.query(kind);
  }

  async openSettings(kind: PermissionKind): Promise<void> {
    await this.opener?.openExternal(windowsSettingsLinks[kind]);
  }
}

export class ElectronGlobalShortcutAdapter implements HotkeyAdapter {
  readonly descriptor: AdapterDescriptor;
  readonly supportsKeyRelease = false;

  constructor(
    private readonly bridge: GlobalShortcutBridge,
    platform: AdapterPlatform,
  ) {
    this.descriptor = descriptor(`${platform}-global-shortcut`, `${platform} global shortcut adapter`, platform, 'partial', 'Uses Electron globalShortcut with Swift shortcut label normalization.');
  }

  async register(shortcut: string, pressed: () => void, _released?: () => void): Promise<void> {
    const accelerator = shortcutLabelToAccelerator(shortcut);
    if (!this.bridge.register(accelerator, pressed)) throw new Error(`Unable to register global shortcut: ${shortcut}`);
  }

  async unregister(shortcut: string): Promise<void> {
    this.bridge.unregister(shortcutLabelToAccelerator(shortcut));
  }
}


export class FallbackHotkeyAdapter implements HotkeyAdapter {
  readonly descriptor: AdapterDescriptor;
  readonly #primary: HotkeyAdapter;
  readonly #fallback: HotkeyAdapter;
  #active: HotkeyAdapter | null = null;

  constructor(primary: HotkeyAdapter, fallback: HotkeyAdapter) {
    this.#primary = primary;
    this.#fallback = fallback;
    this.descriptor = descriptor(
      `${primary.descriptor.id}-with-fallback`,
      `${primary.descriptor.label} with ${fallback.descriptor.label} fallback`,
      primary.descriptor.platform,
      primary.descriptor.status,
      `${primary.descriptor.detail} Falls back to ${fallback.descriptor.label} when the native helper is unavailable.`,
    );
  }

  get supportsKeyRelease(): boolean {
    return this.#active?.supportsKeyRelease === true;
  }

  async register(shortcut: string, pressed: () => void, released?: () => void): Promise<void> {
    try {
      await this.#primary.register(shortcut, pressed, released);
      this.#active = this.#primary;
    } catch {
      await this.#fallback.register(shortcut, pressed, released);
      this.#active = this.#fallback;
    }
  }

  async unregister(shortcut: string): Promise<void> {
    await Promise.allSettled([this.#primary.unregister(shortcut), this.#fallback.unregister(shortcut)]);
    this.#active = null;
  }
}

export class MacOSEventTapHotkeyAdapter implements HotkeyAdapter {
  readonly descriptor = descriptor(
    'macos-event-tap-hotkey',
    'macOS CGEventTap hotkey adapter',
    'macos',
    'partial',
    'Uses a native CGEventTap helper process to emit key-down/key-up events before falling back to Electron globalShortcut.',
  );
  readonly supportsKeyRelease = true;
  readonly #command: string;
  readonly #args: readonly string[];
  readonly #launch: NativeHotkeyHelperLauncher;
  readonly #readyTimeoutMs: number;
  readonly #helpers = new Map<string, NativeHotkeyHelperProcess>();

  constructor(options: NativeHotkeyHelperOptions) {
    this.#command = options.command;
    this.#args = options.args ?? [];
    this.#launch = options.launch ?? defaultNativeHotkeyHelperLauncher;
    this.#readyTimeoutMs = options.readyTimeoutMs ?? 1200;
  }

  async register(shortcut: string, pressed: () => void, released?: () => void): Promise<void> {
    await this.unregister(shortcut);
    const helper = this.#launch(this.#command, [...this.#args, '--shortcut', shortcut]);
    let buffer = '';
    const ready = await new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => settle(false), this.#readyTimeoutMs);
      helper.stdout.on('data', (chunk) => {
        buffer += String(chunk);
        const lines = buffer.split(/\r?\n/u);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const event = parseNativeHotkeyEvent(line);
          if (event === 'ready') settle(true);
          else if (event === 'error') settle(false);
          else this.#dispatchEvent(event, pressed, released);
        }
      });
      helper.on('exit', () => settle(false));
      helper.on('error', () => settle(false));
    });

    if (!ready) {
      helper.kill('SIGTERM');
      throw new Error(`macOS event-tap helper did not become ready for shortcut ${shortcut}.`);
    }

    this.#helpers.set(shortcut, helper);
    helper.on('exit', () => {
      if (this.#helpers.get(shortcut) === helper) this.#helpers.delete(shortcut);
    });
    helper.on('error', () => {
      if (this.#helpers.get(shortcut) === helper) this.#helpers.delete(shortcut);
    });
  }

  async unregister(shortcut: string): Promise<void> {
    const helper = this.#helpers.get(shortcut);
    if (!helper) return;
    this.#helpers.delete(shortcut);
    helper.kill('SIGTERM');
  }

  #dispatchEvent(event: NativeHotkeyHelperEvent, pressed: () => void, released?: () => void): void {
    if (event === 'pressed') pressed();
    if (event === 'released') released?.();
  }
}

type NativeHotkeyHelperEvent = 'ready' | 'pressed' | 'released' | 'error' | null;

function defaultNativeHotkeyHelperLauncher(command: string, args: readonly string[]): NativeHotkeyHelperProcess {
  return spawn(command, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseNativeHotkeyEvent(line: string): NativeHotkeyHelperEvent {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed === 'ready' || trimmed === 'pressed' || trimmed === 'released' || trimmed === 'error') return trimmed;
  try {
    const payload = JSON.parse(trimmed) as unknown;
    if (typeof payload === 'object' && payload !== null && 'type' in payload) {
      const type = (payload as { readonly type?: unknown }).type;
      if (type === 'ready' || type === 'pressed' || type === 'released' || type === 'error') return type;
    }
  } catch {
    return null;
  }
  return null;
}

export class CommandTextInsertionAdapter implements TextInsertionAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(
    platform: AdapterPlatform,
    private readonly clipboard: ClipboardBridge,
    private readonly runCommand: CommandRunner,
    private readonly restoreClipboardAfterMs = 2000,
  ) {
    this.descriptor = descriptor(`${platform}-text-insertion`, `${platform} text insertion adapter`, platform, 'partial', 'Writes clipboard and sends platform paste shortcut through an injectable OS command runner.');
  }

  async insertText(text: string, _targetContextId: string | null): Promise<'inserted' | 'copied-to-clipboard'> {
    const previousText = this.clipboard.readText?.();
    this.clipboard.writeText(text);
    const result = await this.runPasteCommand();
    if (result.ok && previousText !== undefined) this.scheduleClipboardRestore(previousText);
    return result.ok ? 'inserted' : 'copied-to-clipboard';
  }

  private runPasteCommand(): Promise<{ readonly ok: boolean; readonly stdout: string; readonly stderr: string }> {
    if (this.descriptor.platform === 'macos') {
      return this.runCommand('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down']);
    }
    if (this.descriptor.platform === 'windows') {
      return this.runCommand('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")']);
    }
    return Promise.resolve({ ok: false, stdout: '', stderr: 'unsupported platform' });
  }

  private scheduleClipboardRestore(previousText: string): void {
    const timer = setTimeout(() => this.clipboard.writeText(previousText), this.restoreClipboardAfterMs);
    timer.unref?.();
  }
}

export class CommandMediaPlaybackAdapter implements MediaPlaybackAdapter {
  readonly descriptor: AdapterDescriptor;
  #pausedByWhispree = false;

  constructor(
    platform: AdapterPlatform,
    private readonly runCommand: CommandRunner,
  ) {
    this.descriptor = descriptor(`${platform}-media-playback`, `${platform} media playback adapter`, platform, 'partial', 'Pauses/resumes common media apps through platform command scripts behind an adapter seam.');
  }

  async pauseIfPlaying(): Promise<void> {
    const result = this.descriptor.platform === 'macos'
      ? await this.runCommand('osascript', ['-e', 'tell application "Music" to if it is running then pause', '-e', 'tell application "Spotify" to if it is running then pause'])
      : await this.runCommand('powershell.exe', ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]179)']);
    this.#pausedByWhispree = result.ok;
  }

  async resumeIfPaused(): Promise<void> {
    if (!this.#pausedByWhispree) return;
    this.#pausedByWhispree = false;
    if (this.descriptor.platform === 'macos') {
      await this.runCommand('osascript', ['-e', 'tell application "Music" to if it is running then play', '-e', 'tell application "Spotify" to if it is running then play']);
      return;
    }
    await this.runCommand('powershell.exe', ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]179)']);
  }
}

export class AppleScriptBrowserContextAdapter implements BrowserContextAdapter {
  readonly descriptor = descriptor('macos-browser-context', 'macOS browser context adapter', 'macos', 'partial', 'Captures front Chrome tab title/URL through AppleScript when Automation is granted.');

  constructor(private readonly runCommand: CommandRunner) {}

  async capture(): Promise<string | null> {
    const script = 'tell application "Google Chrome" to if (count of windows) > 0 then return (URL of active tab of front window) & "\n" & (title of active tab of front window)';
    const result = await this.runCommand('osascript', ['-e', script]);
    return result.ok && result.stdout ? result.stdout : null;
  }

  async restore(contextId: string): Promise<boolean> {
    const url = contextId.split('\n')[0] ?? contextId;
    if (!/^https?:\/\//u.test(url)) return false;
    const result = await this.runCommand('open', ['-a', 'Google Chrome', url]);
    return result.ok;
  }
}

export class AppleScriptTerminalContextAdapter implements TerminalContextAdapter {
  readonly descriptor = descriptor('macos-terminal-context', 'macOS terminal context adapter', 'macos', 'partial', 'Captures front Terminal/iTerm title through AppleScript when Automation is granted.');

  constructor(private readonly runCommand: CommandRunner) {}

  async capture(): Promise<string | null> {
    const iterm = await this.runCommand('osascript', ['-e', 'tell application "iTerm2" to if (count of windows) > 0 then return name of current session of current window']);
    if (iterm.ok && iterm.stdout) return iterm.stdout;
    const terminal = await this.runCommand('osascript', ['-e', 'tell application "Terminal" to if (count of windows) > 0 then return name of front window']);
    return terminal.ok && terminal.stdout ? terminal.stdout : null;
  }

  async restore(_contextId: string): Promise<boolean> {
    const result = await this.runCommand('open', ['-a', 'iTerm']);
    return result.ok;
  }
}

export class MacOSScreenshotContextAdapter implements ScreenContextAdapter {
  readonly descriptor = descriptor('macos-screen-context', 'macOS screenshot context adapter', 'macos', 'partial', 'Captures a screenshot through screencapture once Screen Recording permission exists.');
  private active = false;

  constructor(
    private readonly runCommand: CommandRunner,
    private readonly outputPath: () => string,
  ) {}

  async startCapture(): Promise<void> {
    this.active = true;
  }

  async stopCapture(): Promise<readonly string[]> {
    if (!this.active) return [];
    this.active = false;
    const file = this.outputPath();
    const result = await this.runCommand('screencapture', ['-x', file]);
    return result.ok ? [file] : [];
  }
}

export function shortcutLabelToAccelerator(label: string): string {
  return label
    .replaceAll('⌘', 'CommandOrControl+')
    .replaceAll('⌃', 'Control+')
    .replaceAll('⇧', 'Shift+')
    .replaceAll('⌥', 'Alt+')
    .replace(/\+$/u, '')
    .replace(/esc/iu, 'Escape')
    .replace(/space/iu, 'Space');
}

function mediaStatusToPermissionState(status: ReturnType<ElectronPermissionBridge['getMediaAccessStatus']>): PermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied' || status === 'restricted') return 'denied';
  if (status === 'not-determined') return 'prompt-required';
  return 'unsupported';
}
