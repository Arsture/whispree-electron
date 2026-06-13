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

export function createAdapterSet(platformInput: string, mode: 'mock' | 'shell' = 'shell'): AdapterSet {
  if (mode === 'mock') return createMockAdapterSet();
  const platform = normalizeRuntimePlatform(platformInput);
  if (platform === 'macos') return createMacOSAdapterSet();
  if (platform === 'windows') return createWindowsAdapterSet();
  return createUnknownAdapterSet();
}

export function permissionCardsForAdapterSet(adapters: AdapterSet): readonly PermissionCardSnapshot[] {
  return permissionKinds.map((kind) => permissionCard(kind, adapters.platform));
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

function createMacOSAdapterSet(): AdapterSet {
  return {
    platform: 'macos',
    permission: new StaticPermissionAdapter('macos', 'planned', 'not-tested', 'macOS TCC permission checks are adapter-planned.'),
    hotkey: new PlannedHotkeyAdapter('macos', 'planned', 'Future Electron/globalShortcut or event-tap bridge; conflict UX preserved from Swift.'),
    audio: new PlannedAudioCaptureAdapter('macos', 'planned', 'Future AVAudioEngine/native helper path with 16kHz mono/VAD metadata.'),
    textInsertion: new ClipboardFallbackTextInsertionAdapter('macos', 'planned', 'Future Accessibility + clipboard insertion; current shell falls back to clipboard semantics.'),
    screenContext: new PlannedScreenContextAdapter('macos', 'planned', 'Future ScreenCaptureKit/screenshot selection adapter.'),
    browserContext: new StaticBrowserContextAdapter('macos', 'planned', 'Future Chrome Apple Events adapter with visible Automation guidance.'),
    terminalContext: new StaticTerminalContextAdapter('macos', 'planned', 'Future iTerm2/tmux restore adapter with Automation guidance.'),
  };
}

function createWindowsAdapterSet(): AdapterSet {
  return {
    platform: 'windows',
    permission: new StaticPermissionAdapter('windows', 'not-tested', 'not-tested', 'Windows permission flow has not been executed yet.'),
    hotkey: new PlannedHotkeyAdapter('windows', 'not-tested', 'Future RegisterHotKey/globalShortcut path; not executed on Windows.'),
    audio: new PlannedAudioCaptureAdapter('windows', 'not-tested', 'Future WASAPI/native helper path; not executed on Windows.'),
    textInsertion: new ClipboardFallbackTextInsertionAdapter('windows', 'not-tested', 'Future SendInput/clipboard path; not executed on Windows.'),
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

function permissionCard(kind: PermissionKind, platform: RuntimePlatform): PermissionCardSnapshot {
  const base = permissionLabels[kind];
  const status = platform === 'macos' ? 'planned' : platform === 'windows' ? 'not-tested' : 'unsupported';
  const state: PermissionState = platform === 'macos' ? 'not-tested' : platform === 'windows' ? 'not-tested' : 'unsupported';
  return {
    kind,
    label: base.label,
    state,
    status,
    detail: `${base.detail} ${platform === 'windows' ? 'Windows execution is not-tested.' : platform === 'macos' ? 'macOS adapter is planned.' : 'Unsupported platform.'}`,
  };
}
