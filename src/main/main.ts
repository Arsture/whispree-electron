import { app, BrowserWindow, Menu, Tray, clipboard, ipcMain, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { IPC_CHANNELS } from '../shared/ipc';
import { resolveScreenshotCapturePath } from './screenshot-capture';
import { commandError, commandOk, rejectUnexpectedArgs, rejectUnexpectedSettingsArgs, settingsCommandError, settingsCommandOk, validatePermissionKindInput } from './ipc-validation';
import { MockDictationPipeline } from './mock-pipeline';
import { createSettingsStore, type FileSettingsStore } from './settings-store';
import { createHistoryStore, type FileHistoryStore } from './history-store';
import { copyHistoryTextFromSnapshot } from './history-copy';

const dirname = __dirname;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let settingsStore: FileSettingsStore | null = null;
let historyStore: FileHistoryStore | null = null;
let pipeline: MockDictationPipeline | null = null;
const emitAppSnapshot = (snapshot: ReturnType<MockDictationPipeline['getSnapshot']>) => {
  mainWindow?.webContents.send(IPC_CHANNELS.appSnapshotUpdated, snapshot);
};

if (started) {
  app.quit();
}


async function captureAndQuit(outputPath: string): Promise<void> {
  if (!mainWindow) return;
  try {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const image = await mainWindow.webContents.capturePage();
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, image.toPNG());
  } finally {
    app.quit();
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    title: 'Whispree Electron',
    webPreferences: {
      preload: path.join(dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const screenshotCapture = resolveScreenshotCapturePath(process.env.WHISPREE_CAPTURE_SCREENSHOT, {
    repoRoot: app.getAppPath(),
    isPackaged: app.isPackaged,
    nodeEnv: process.env.NODE_ENV,
  });
  if (screenshotCapture.enabled) {
    mainWindow.webContents.once('did-finish-load', () => {
      void captureAndQuit(screenshotCapture.outputPath);
    });
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

function createTrayIcon() {
  const iconPath = path.join(app.getAppPath(), 'assets/tray-template.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (!icon.isEmpty()) {
    icon.setTemplateImage(true);
    return icon;
  }
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAIElEQVR4AWP4////fwYiAOOoQoxB1DCCqGEEUQAAkV0kI4nJXH0AAAAASUVORK5CYII=',
  );
}

function createTray(): void {
  if (tray) return;
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Whispree Electron');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show Dashboard',
        click: () => {
          if (!mainWindow) createMainWindow();
          mainWindow?.show();
        },
      },
      {
        label: 'Enqueue Mock Dictation',
        click: () => {
          getPipeline().enqueueMockDictation();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Whispree',
        role: 'quit',
      },
    ]),
  );
}

function getSettingsStore(): FileSettingsStore {
  settingsStore ??= createSettingsStore(app.getPath('userData'));
  return settingsStore;
}

function getHistoryStore(): FileHistoryStore {
  historyStore ??= createHistoryStore(app.getPath('userData'));
  return historyStore;
}

function getPipeline(): MockDictationPipeline {
  pipeline ??= new MockDictationPipeline(emitAppSnapshot);
  return pipeline;
}

async function initializeMainState(): Promise<void> {
  await getSettingsStore().load();
  const store = getHistoryStore();
  const history = await store.load();
  pipeline = new MockDictationPipeline(emitAppSnapshot, undefined, {
    historyStore: store,
    initialHistory: history,
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getAppSnapshot, () => getPipeline().getSnapshot());

  ipcMain.handle(IPC_CHANNELS.getSettings, async (_event, ...args: unknown[]) => {
    const store = getSettingsStore();
    const rejected = rejectUnexpectedSettingsArgs('get-settings', store.getSnapshot(), args);
    if (rejected) return rejected;
    return store.getSnapshot();
  });
  ipcMain.handle(IPC_CHANNELS.updateSettings, async (_event, update: unknown, ...args: unknown[]) => {
    const store = getSettingsStore();
    const rejected = rejectUnexpectedSettingsArgs('update-settings', store.getSnapshot(), args);
    if (rejected) return rejected;
    const result = await store.updateUnknown(update);
    if (!result.ok) {
      return settingsCommandError('update-settings', result.settings, result.issues.join('; '), 'invalid-input');
    }
    return settingsCommandOk('update-settings', result.settings, 'Settings updated.');
  });
  ipcMain.handle(IPC_CHANNELS.resetSettings, async (_event, ...args: unknown[]) => {
    const store = getSettingsStore();
    const rejected = rejectUnexpectedSettingsArgs('reset-settings', store.getSnapshot(), args);
    if (rejected) return rejected;
    return settingsCommandOk('reset-settings', await store.reset(), 'Settings reset.');
  });
  ipcMain.handle(IPC_CHANNELS.enqueueMockDictation, (_event, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const rejected = rejectUnexpectedArgs('enqueue-mock-dictation', currentPipeline.getSnapshot(), args);
    if (rejected) return rejected;
    return commandOk('enqueue-mock-dictation', currentPipeline.enqueueMockDictation(), 'Mock dictation enqueued.');
  });
  ipcMain.handle(IPC_CHANNELS.cancelForegroundJob, (_event, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const rejected = rejectUnexpectedArgs('cancel-foreground-job', currentPipeline.getSnapshot(), args);
    if (rejected) return rejected;
    return commandOk('cancel-foreground-job', currentPipeline.cancelForegroundJob(), 'Foreground mock scope canceled.');
  });
  ipcMain.handle(IPC_CHANNELS.openSettings, (_event, ...args: unknown[]) => {
    const snapshot = getPipeline().getSnapshot();
    const rejected = rejectUnexpectedArgs('open-settings', snapshot, args);
    if (rejected) return rejected;
    return commandError('open-settings', snapshot, 'Settings window is planned after the dashboard shell.', 'not-implemented');
  });

  ipcMain.handle(IPC_CHANNELS.copyHistoryText, (_event, historyId: unknown, variant: unknown, ...args: unknown[]) => {
    const snapshot = getPipeline().getSnapshot();
    const rejected = rejectUnexpectedArgs('copy-history-text', snapshot, args);
    if (rejected) return rejected;
    return copyHistoryTextFromSnapshot(snapshot, historyId, variant, clipboard);
  });

  ipcMain.handle(IPC_CHANNELS.requestPermission, (_event, kind: unknown, ...args: unknown[]) => {
    const snapshot = getPipeline().getSnapshot();
    const rejected = rejectUnexpectedArgs('request-permission', snapshot, args);
    if (rejected) return rejected;
    const validation = validatePermissionKindInput(snapshot, kind);
    if (!validation.ok) return validation.result;
    return commandError(
      'request-permission',
      snapshot,
      `${validation.kind} permission is adapter-planned and not requested in mock mode.`,
      'not-implemented',
    );
  });
}

app.whenReady().then(() => {
  void initializeMainState().then(() => {
    registerIpcHandlers();
    createMainWindow();
    createTray();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
