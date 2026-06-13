import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type AppSnapshot, type PermissionKind } from '../shared/ipc';
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
};

contextBridge.exposeInMainWorld('whispree', whispreeApi);
