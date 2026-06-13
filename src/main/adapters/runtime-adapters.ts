import type {
  AdapterDescriptor,
  AdapterPlatform,
  BrowserContextAdapter,
  HotkeyAdapter,
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

  constructor(
    private readonly bridge: GlobalShortcutBridge,
    platform: AdapterPlatform,
  ) {
    this.descriptor = descriptor(`${platform}-global-shortcut`, `${platform} global shortcut adapter`, platform, 'partial', 'Uses Electron globalShortcut with Swift shortcut label normalization.');
  }

  async register(shortcut: string, callback: () => void): Promise<void> {
    const accelerator = shortcutLabelToAccelerator(shortcut);
    if (!this.bridge.register(accelerator, callback)) throw new Error(`Unable to register global shortcut: ${shortcut}`);
  }

  async unregister(shortcut: string): Promise<void> {
    this.bridge.unregister(shortcutLabelToAccelerator(shortcut));
  }
}

export class CommandTextInsertionAdapter implements TextInsertionAdapter {
  readonly descriptor: AdapterDescriptor;

  constructor(
    platform: AdapterPlatform,
    private readonly clipboard: ClipboardBridge,
    private readonly runCommand: CommandRunner,
  ) {
    this.descriptor = descriptor(`${platform}-text-insertion`, `${platform} text insertion adapter`, platform, 'partial', 'Writes clipboard and sends platform paste shortcut through an injectable OS command runner.');
  }

  async insertText(text: string, _targetContextId: string | null): Promise<'inserted' | 'copied-to-clipboard'> {
    this.clipboard.writeText(text);
    const result = await this.runPasteCommand();
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
