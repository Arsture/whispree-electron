import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type AppSnapshot, type PermissionKind, type SettingsUpdateInput } from '../shared/ipc';
import type { WhispreeAPI } from '../shared/whispree-api';

const whispreeApi: WhispreeAPI = {
  getAppSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.getAppSnapshot) as Promise<AppSnapshot>,
  subscribeAppSnapshot: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: AppSnapshot) => callback(snapshot);
    ipcRenderer.on(IPC_CHANNELS.appSnapshotUpdated, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.appSnapshotUpdated, listener);
    };
  },
  enqueueMockDictation: () =>
    ipcRenderer.invoke(IPC_CHANNELS.enqueueMockDictation) as ReturnType<WhispreeAPI['enqueueMockDictation']>,
  cancelForegroundJob: () =>
    ipcRenderer.invoke(IPC_CHANNELS.cancelForegroundJob) as ReturnType<WhispreeAPI['cancelForegroundJob']>,
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.openSettings) as ReturnType<WhispreeAPI['openSettings']>,
  requestPermission: (kind: PermissionKind) =>
    ipcRenderer.invoke(IPC_CHANNELS.requestPermission, kind) as ReturnType<WhispreeAPI['requestPermission']>,
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings) as ReturnType<WhispreeAPI['getSettings']>,
  updateSettings: (update: SettingsUpdateInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateSettings, update) as ReturnType<WhispreeAPI['updateSettings']>,
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.resetSettings) as ReturnType<WhispreeAPI['resetSettings']>,
};

contextBridge.exposeInMainWorld('whispree', whispreeApi);
