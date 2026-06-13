import type {
  AudioCaptureAdapter,
  BrowserContextAdapter,
  HotkeyAdapter,
  PermissionAdapter,
  ScreenContextAdapter,
  TerminalContextAdapter,
  TextInsertionAdapter,
} from '../../shared/adapters';
import type { PermissionCardSnapshot, PermissionKind, PermissionState } from '../../shared/ipc';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import {
  ClipboardFallbackTextInsertionAdapter,
  MockAudioCaptureAdapter,
  MockHotkeyAdapter,
  MockScreenContextAdapter,
  MockTextInsertionAdapter,
  PlannedAudioCaptureAdapter,
  PlannedHotkeyAdapter,
  PlannedScreenContextAdapter,
  StaticBrowserContextAdapter,
  StaticPermissionAdapter,
  StaticTerminalContextAdapter,
} from './mock-adapters';
import {
  AppleScriptBrowserContextAdapter,
  AppleScriptTerminalContextAdapter,
  CommandTextInsertionAdapter,
  ElectronGlobalShortcutAdapter,
  MacOSPermissionAdapter,
  MacOSScreenshotContextAdapter,
  WindowsPermissionAdapter,
  type ClipboardBridge,
  type CommandRunner,
  type ElectronPermissionBridge,
  type ExternalUrlOpener,
  type GlobalShortcutBridge,
} from './runtime-adapters';

export type RuntimePlatform = 'macos' | 'windows' | 'unknown';

export interface AdapterSet {
  readonly platform: RuntimePlatform;
  readonly permission: PermissionAdapter;
  readonly hotkey: HotkeyAdapter;
  readonly audio: AudioCaptureAdapter;
  readonly textInsertion: TextInsertionAdapter;
  readonly screenContext: ScreenContextAdapter;
  readonly browserContext: BrowserContextAdapter;
  readonly terminalContext: TerminalContextAdapter;
}

export interface AdapterRuntimeDependencies {
  readonly permissionBridge?: ElectronPermissionBridge;
  readonly externalUrlOpener?: ExternalUrlOpener;
  readonly globalShortcutBridge?: GlobalShortcutBridge;
  readonly clipboardBridge?: ClipboardBridge;
  readonly commandRunner?: CommandRunner;
}

const permissionLabels: Record<PermissionKind, { readonly label: string; readonly detail: string }> = {
  microphone: { label: 'Microphone', detail: 'Required for real audio capture.' },
  accessibility: { label: 'Accessibility', detail: 'Required for target-app insertion and app restoration.' },
  'screen-recording': { label: 'Screen Recording', detail: 'Required for screenshot/VLM context.' },
  'browser-context': { label: 'Browser Context', detail: 'Chrome restore/capture adapter state.' },
  'terminal-context': { label: 'Terminal Context', detail: 'Terminal/iTerm/tmux restore adapter state.' },
};

const permissionKinds: readonly PermissionKind[] = ['microphone', 'accessibility', 'screen-recording', 'browser-context', 'terminal-context'];

export function normalizeRuntimePlatform(platform: string): RuntimePlatform {
  if (platform === 'darwin' || platform === 'macos') return 'macos';
  if (platform === 'win32' || platform === 'windows') return 'windows';
  return 'unknown';
}

export function createAdapterSet(platformInput: string, mode: 'mock' | 'shell' = 'shell', dependencies: AdapterRuntimeDependencies = {}): AdapterSet {
  if (mode === 'mock') return createMockAdapterSet();
  const platform = normalizeRuntimePlatform(platformInput);
  if (platform === 'macos') return createMacOSAdapterSet(dependencies);
  if (platform === 'windows') return createWindowsAdapterSet(dependencies);
  return createUnknownAdapterSet();
}

export function permissionCardsForAdapterSet(adapters: AdapterSet): readonly PermissionCardSnapshot[] {
  return permissionKinds.map((kind) => permissionCard(kind, adapters.platform, adapters.permission.descriptor.status));
}

export async function queryPermissionCardsForAdapterSet(adapters: AdapterSet): Promise<readonly PermissionCardSnapshot[]> {
  const cards = await Promise.all(permissionKinds.map(async (kind) => {
    const base = permissionLabels[kind];
    const state = await adapters.permission.query(kind);
    return {
      kind,
      label: base.label,
      state,
      status: stateToImplementationStatus(state, adapters.permission.descriptor.status),
      detail: `${base.detail} ${permissionStateDetail(state, adapters.platform)}`,
    };
  }));
  return cards;
}

function createMockAdapterSet(): AdapterSet {
  return {
    platform: 'unknown',
    permission: new StaticPermissionAdapter('cross-platform', 'mock', 'mock', 'Mock permissions are granted by test harness only.'),
    hotkey: new MockHotkeyAdapter(),
    audio: new MockAudioCaptureAdapter(),
    textInsertion: new MockTextInsertionAdapter(),
    screenContext: new MockScreenContextAdapter(),
    browserContext: new StaticBrowserContextAdapter('cross-platform', 'mock', 'Mock browser context returns null by default.'),
    terminalContext: new StaticTerminalContextAdapter('cross-platform', 'mock', 'Mock terminal context returns null by default.'),
  };
}

function createMacOSAdapterSet(dependencies: AdapterRuntimeDependencies): AdapterSet {
  const runner = dependencies.commandRunner ?? defaultCommandRunner;
  const permission =
    dependencies.permissionBridge && dependencies.externalUrlOpener
      ? new MacOSPermissionAdapter(dependencies.permissionBridge, dependencies.externalUrlOpener)
      : new StaticPermissionAdapter('macos', 'planned', 'not-tested', 'macOS TCC permission checks are adapter-planned.');
  return {
    platform: 'macos',
    permission,
    hotkey: dependencies.globalShortcutBridge
      ? new ElectronGlobalShortcutAdapter(dependencies.globalShortcutBridge, 'macos')
      : new PlannedHotkeyAdapter('macos', 'planned', 'Future Electron/globalShortcut or event-tap bridge; conflict UX preserved from Swift.'),
    audio: new PlannedAudioCaptureAdapter('macos', 'partial', 'Renderer MediaRecorder captures real microphone bytes; native AVAudioEngine helper remains future work.'),
    textInsertion: dependencies.clipboardBridge
      ? new CommandTextInsertionAdapter('macos', dependencies.clipboardBridge, runner)
      : new ClipboardFallbackTextInsertionAdapter('macos', 'planned', 'Future Accessibility + clipboard insertion; current shell falls back to clipboard semantics.'),
    screenContext: new MacOSScreenshotContextAdapter(runner, () => path.join(mkdtempSync(path.join(tmpdir(), 'whispree-screen-')), 'capture.png')),
    browserContext: new AppleScriptBrowserContextAdapter(runner),
    terminalContext: new AppleScriptTerminalContextAdapter(runner),
  };
}

function createWindowsAdapterSet(dependencies: AdapterRuntimeDependencies): AdapterSet {
  const runner = dependencies.commandRunner ?? defaultCommandRunner;
  return {
    platform: 'windows',
    permission: new WindowsPermissionAdapter(dependencies.permissionBridge ?? null),
    hotkey: dependencies.globalShortcutBridge
      ? new ElectronGlobalShortcutAdapter(dependencies.globalShortcutBridge, 'windows')
      : new PlannedHotkeyAdapter('windows', 'not-tested', 'Future RegisterHotKey/globalShortcut path; not executed on Windows.'),
    audio: new PlannedAudioCaptureAdapter('windows', 'not-tested', 'Future WASAPI/native helper path; not executed on Windows.'),
    textInsertion: dependencies.clipboardBridge
      ? new CommandTextInsertionAdapter('windows', dependencies.clipboardBridge, runner)
      : new ClipboardFallbackTextInsertionAdapter('windows', 'not-tested', 'Future SendInput/clipboard path; not executed on Windows.'),
    screenContext: new PlannedScreenContextAdapter('windows', 'not-tested', 'Future Windows Graphics Capture path; not executed on Windows.'),
    browserContext: new StaticBrowserContextAdapter('windows', 'not-tested', 'Future browser automation strategy unselected/not-tested.'),
    terminalContext: new StaticTerminalContextAdapter('windows', 'not-tested', 'Future Windows Terminal context strategy unselected/not-tested.'),
  };
}

function createUnknownAdapterSet(): AdapterSet {
  return {
    platform: 'unknown',
    permission: new StaticPermissionAdapter('cross-platform', 'unsupported', 'unsupported', 'Unknown platform is unsupported until an adapter set is selected.'),
    hotkey: new PlannedHotkeyAdapter('cross-platform', 'unsupported', 'Unknown platform hotkeys are unsupported.'),
    audio: new PlannedAudioCaptureAdapter('cross-platform', 'unsupported', 'Unknown platform audio capture is unsupported.'),
    textInsertion: new ClipboardFallbackTextInsertionAdapter('cross-platform', 'unsupported', 'Unknown platform insertion falls back to clipboard semantics.'),
    screenContext: new PlannedScreenContextAdapter('cross-platform', 'unsupported', 'Unknown platform screen context is unsupported.'),
    browserContext: new StaticBrowserContextAdapter('cross-platform', 'unsupported', 'Unknown platform browser context is unsupported.'),
    terminalContext: new StaticTerminalContextAdapter('cross-platform', 'unsupported', 'Unknown platform terminal context is unsupported.'),
  };
}

function permissionCard(kind: PermissionKind, platform: RuntimePlatform, adapterStatus?: PermissionCardSnapshot['status']): PermissionCardSnapshot {
  const base = permissionLabels[kind];
  const status = adapterStatus ?? (platform === 'macos' ? 'planned' : platform === 'windows' ? 'not-tested' : 'unsupported');
  const state: PermissionState = platform === 'macos' ? 'not-tested' : platform === 'windows' ? 'not-tested' : 'unsupported';
  return {
    kind,
    label: base.label,
    state,
    status,
    detail: `${base.detail} ${platform === 'windows' ? 'Windows execution is not-tested.' : platform === 'macos' ? 'macOS adapter is planned.' : 'Unsupported platform.'}`,
  };
}

function stateToImplementationStatus(state: PermissionState, fallback: PermissionCardSnapshot['status']): PermissionCardSnapshot['status'] {
  if (state === 'granted') return 'implemented';
  if (state === 'unsupported') return 'unsupported';
  if (state === 'not-tested') return 'not-tested';
  if (state === 'mock') return 'mock';
  return fallback === 'planned' ? 'partial' : fallback;
}

function permissionStateDetail(state: PermissionState, platform: RuntimePlatform): string {
  if (state === 'granted') return 'Permission is currently granted.';
  if (state === 'denied') return 'Permission is denied/restricted; open OS settings to grant it.';
  if (state === 'prompt-required') return 'User prompt or OS settings grant is required.';
  if (state === 'not-tested') return `${platform} execution is not-tested.`;
  if (state === 'mock') return 'Mock permission state from test adapter.';
  return 'Permission is unsupported on this platform.';
}

const defaultCommandRunner: CommandRunner = (command, args) => new Promise((resolve) => {
  execFile(command, [...args], { timeout: 3000 }, (error, stdout, stderr) => {
    resolve({
      ok: !error,
      stdout: stdout.trim(),
      stderr: stderr.trim() || (error instanceof Error ? error.message : ''),
    });
  });
});
