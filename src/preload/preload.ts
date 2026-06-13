import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  initialAppSnapshot,
  type AppSnapshot,
  type CommandAction,
  type CommandError,
  type CommandResult,
  type HistoryTextVariant,
  type PermissionKind,
  type RecordedAudioInput,
  type SettingsUpdateInput,
} from '../shared/ipc';
import type { WhispreeAPI } from '../shared/whispree-api';

let activeStream: MediaStream | null = null;
let activeRecorder: MediaRecorder | null = null;
let activeChunks: Blob[] = [];
let recordingStartedAt = 0;

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
  startRealRecording: async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return localCommandError('start-real-recording', 'Browser audio capture is not available in this Electron runtime.', 'unsupported');
    }
    if (activeRecorder) {
      return localCommandError('start-real-recording', 'A real recording session is already active.');
    }

    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      activeChunks = [];
      activeRecorder = new MediaRecorder(activeStream);
      activeRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) activeChunks.push(event.data);
      });
      recordingStartedAt = Date.now();
      activeRecorder.start();
      const result = await ipcRenderer.invoke(IPC_CHANNELS.startRealRecording, { mimeType: activeRecorder.mimeType || null });
      if (!isCommandOk(result)) {
        stopActiveMediaTracks();
        activeRecorder = null;
      }
      return result as ReturnType<WhispreeAPI['startRealRecording']>;
    } catch (error) {
      stopActiveMediaTracks();
      activeRecorder = null;
      return localCommandError('start-real-recording', `Unable to start microphone capture: ${errorMessage(error)}`);
    }
  },
  stopRealRecording: async () => {
    const recorder = activeRecorder;
    if (!recorder) {
      return localCommandError('submit-recorded-audio', 'No real recording session is active.');
    }
    try {
      const payload = await stopRecorder(recorder);
      activeRecorder = null;
      stopActiveMediaTracks();
      return ipcRenderer.invoke(IPC_CHANNELS.submitRecordedAudio, payload) as ReturnType<WhispreeAPI['stopRealRecording']>;
    } catch (error) {
      activeRecorder = null;
      stopActiveMediaTracks();
      return localCommandError('submit-recorded-audio', `Unable to stop microphone capture: ${errorMessage(error)}`);
    }
  },
  cancelForegroundJob: () =>
    cancelForegroundRecording(),
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.openSettings) as ReturnType<WhispreeAPI['openSettings']>,
  requestPermission: (kind: PermissionKind) =>
    ipcRenderer.invoke(IPC_CHANNELS.requestPermission, kind) as ReturnType<WhispreeAPI['requestPermission']>,
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings) as ReturnType<WhispreeAPI['getSettings']>,
  updateSettings: (update: SettingsUpdateInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateSettings, update) as ReturnType<WhispreeAPI['updateSettings']>,
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.resetSettings) as ReturnType<WhispreeAPI['resetSettings']>,
  copyHistoryText: (historyId: string, variant: HistoryTextVariant) =>
    ipcRenderer.invoke(IPC_CHANNELS.copyHistoryText, historyId, variant) as ReturnType<WhispreeAPI['copyHistoryText']>,
  clearHistory: () =>
    ipcRenderer.invoke(IPC_CHANNELS.clearHistory) as ReturnType<WhispreeAPI['clearHistory']>,
};

contextBridge.exposeInMainWorld('whispree', whispreeApi);

function stopRecorder(recorder: MediaRecorder): Promise<RecordedAudioInput> {
  return new Promise((resolve, reject) => {
    const mimeType = recorder.mimeType || 'audio/webm';
    recorder.addEventListener('stop', () => {
      const blob = new Blob(activeChunks, { type: mimeType });
      activeChunks = [];
      void blob.arrayBuffer().then((bytes) => {
        resolve({
          bytes,
          mimeType,
          durationMs: Date.now() - recordingStartedAt,
        });
      }, reject);
    }, { once: true });
    recorder.stop();
  });
}

function stopActiveMediaTracks(): void {
  activeStream?.getTracks().forEach((track) => {
    track.stop();
  });
  activeStream = null;
  activeChunks = [];
}

function cancelForegroundRecording(): ReturnType<WhispreeAPI['cancelForegroundJob']> {
  if (activeRecorder) {
    activeRecorder.ondataavailable = null;
    activeRecorder.onstop = null;
    if (activeRecorder.state !== 'inactive') activeRecorder.stop();
    activeRecorder = null;
  }
  stopActiveMediaTracks();
  return ipcRenderer.invoke(IPC_CHANNELS.cancelForegroundJob) as ReturnType<WhispreeAPI['cancelForegroundJob']>;
}

async function localCommandError(
  action: CommandAction,
  message: string,
  code: CommandError['code'] = 'invalid-input',
): Promise<CommandResult> {
  let snapshot = initialAppSnapshot;
  try {
    snapshot = await whispreeApi.getAppSnapshot();
  } catch {
    // The local fallback still needs to report a typed command result if main is unreachable.
  }
  return {
    ok: false,
    action,
    snapshot,
    error: {
      code,
      message,
    },
  } as CommandResult;
}

function isCommandOk(value: unknown): value is { readonly ok: true } {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
