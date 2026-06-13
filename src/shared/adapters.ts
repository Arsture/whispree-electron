import type { PermissionKind, PermissionState } from './ipc';
import type { ImplementationStatus } from './status';

export type AdapterPlatform = 'macos' | 'windows' | 'cross-platform';

export interface AdapterDescriptor {
  readonly id: string;
  readonly label: string;
  readonly platform: AdapterPlatform;
  readonly status: ImplementationStatus;
  readonly detail: string;
}

export interface PermissionAdapter {
  readonly descriptor: AdapterDescriptor;
  query(kind: PermissionKind): Promise<PermissionState>;
  request(kind: PermissionKind): Promise<PermissionState>;
  openSettings(kind: PermissionKind): Promise<void>;
}

export interface HotkeyAdapter {
  readonly descriptor: AdapterDescriptor;
  register(shortcut: string, callback: () => void): Promise<void>;
  unregister(shortcut: string): Promise<void>;
}

export interface AudioCaptureAdapter {
  readonly descriptor: AdapterDescriptor;
  start(): Promise<void>;
  stop(): Promise<{ readonly audioRef: string }>;
}

export interface MediaPlaybackAdapter {
  readonly descriptor: AdapterDescriptor;
  pauseIfPlaying(): Promise<void>;
  resumeIfPaused(): Promise<void>;
}

export interface TextInsertionAdapter {
  readonly descriptor: AdapterDescriptor;
  insertText(text: string, targetContextId: string | null): Promise<'inserted' | 'copied-to-clipboard'>;
}

export interface ScreenContextAdapter {
  readonly descriptor: AdapterDescriptor;
  startCapture(): Promise<void>;
  stopCapture(): Promise<readonly string[]>;
}

export interface BrowserContextAdapter {
  readonly descriptor: AdapterDescriptor;
  capture(): Promise<string | null>;
  restore(contextId: string): Promise<boolean>;
}

export interface TerminalContextAdapter {
  readonly descriptor: AdapterDescriptor;
  capture(): Promise<string | null>;
  restore(contextId: string): Promise<boolean>;
}

export const permissionStateOrder: readonly PermissionState[] = [
  'granted',
  'denied',
  'prompt-required',
  'unsupported',
  'manual-required',
  'not-tested',
  'mock',
];
