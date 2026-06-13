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
  enqueueMockDictation: () => ipcRenderer.invoke(IPC_CHANNELS.enqueueMockDictation) as Promise<AppSnapshot>,
  cancelForegroundJob: (jobId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.cancelForegroundJob, jobId) as Promise<AppSnapshot>,
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.openSettings) as Promise<AppSnapshot>,
  requestPermission: (kind: PermissionKind) =>
    ipcRenderer.invoke(IPC_CHANNELS.requestPermission, kind) as Promise<AppSnapshot>,
};

contextBridge.exposeInMainWorld('whispree', whispreeApi);
