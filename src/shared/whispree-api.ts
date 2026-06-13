import type { AppSnapshot, CommandResult, HistoryTextVariant, PermissionKind, SettingsCommandResult, SettingsUpdateInput } from './ipc';
import type { AppSettingsSnapshot } from './settings';

export interface WhispreeAPI {
  getAppSnapshot(): Promise<AppSnapshot>;
  subscribeAppSnapshot(callback: (snapshot: AppSnapshot) => void): () => void;
  enqueueMockDictation(): Promise<CommandResult>;
  startRealRecording(): Promise<CommandResult>;
  stopRealRecording(): Promise<CommandResult>;
  cancelForegroundJob(): Promise<CommandResult>;
  openSettings(): Promise<CommandResult>;
  requestPermission(kind: PermissionKind): Promise<CommandResult>;
  getSettings(): Promise<AppSettingsSnapshot>;
  updateSettings(update: SettingsUpdateInput): Promise<SettingsCommandResult>;
  resetSettings(): Promise<SettingsCommandResult>;
  copyHistoryText(historyId: string, variant: HistoryTextVariant): Promise<CommandResult>;
}
