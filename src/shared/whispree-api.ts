import type { AppSnapshot, PermissionKind } from './ipc';

export interface WhispreeAPI {
  getAppSnapshot(): Promise<AppSnapshot>;
  subscribeAppSnapshot(callback: (snapshot: AppSnapshot) => void): () => void;
  enqueueMockDictation(): Promise<AppSnapshot>;
  cancelForegroundJob(jobId?: string): Promise<AppSnapshot>;
  openSettings(): Promise<AppSnapshot>;
  requestPermission(kind: PermissionKind): Promise<AppSnapshot>;
}
