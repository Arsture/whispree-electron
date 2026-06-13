import type { AppSnapshot, CommandResult, PermissionKind } from './ipc';

export interface WhispreeAPI {
  getAppSnapshot(): Promise<AppSnapshot>;
  subscribeAppSnapshot(callback: (snapshot: AppSnapshot) => void): () => void;
  enqueueMockDictation(): Promise<CommandResult>;
  cancelForegroundJob(): Promise<CommandResult>;
  openSettings(): Promise<CommandResult>;
  requestPermission(kind: PermissionKind): Promise<CommandResult>;
}
