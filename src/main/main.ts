import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialAppSnapshot, IPC_CHANNELS, type AppSnapshot, type PermissionKind } from '../shared/ipc';

const dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let snapshot: AppSnapshot = initialAppSnapshot;

if (started) {
  app.quit();
}

function publishSnapshot(): AppSnapshot {
  mainWindow?.webContents.send(IPC_CHANNELS.appSnapshotUpdated, snapshot);
  return snapshot;
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

function createTray(): void {
  if (tray) return;
  tray = new Tray(nativeImage.createEmpty());
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
      { type: 'separator' },
      {
        label: 'Quit Whispree',
        role: 'quit',
      },
    ]),
  );
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getAppSnapshot, () => snapshot);
  ipcMain.handle(IPC_CHANNELS.enqueueMockDictation, () => {
    snapshot = {
      ...snapshot,
      appStatus: 'processing',
      recording: {
        active: true,
        mode: 'mock',
        label: 'Mock recording queued; FIFO pipeline lands in the next slice.',
      },
      queue: {
        ...snapshot.queue,
        totalCount: snapshot.queue.totalCount + 1,
        processingCount: snapshot.queue.processingCount + 1,
        isRecordingActive: true,
        foregroundJobSequence: snapshot.queue.totalCount + 1,
      },
    };
    return publishSnapshot();
  });
  ipcMain.handle(IPC_CHANNELS.cancelForegroundJob, () => {
    snapshot = {
      ...snapshot,
      appStatus: 'ready',
      recording: {
        active: false,
        mode: 'mock',
        label: 'Mock foreground scope canceled.',
      },
      queue: {
        ...snapshot.queue,
        isRecordingActive: false,
        processingCount: Math.max(0, snapshot.queue.processingCount - 1),
        terminalCount: snapshot.queue.terminalCount + (snapshot.queue.totalCount > 0 ? 1 : 0),
      },
    };
    return publishSnapshot();
  });
  ipcMain.handle(IPC_CHANNELS.openSettings, () => snapshot);
  ipcMain.handle(IPC_CHANNELS.requestPermission, (_event, _kind: PermissionKind) => snapshot);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
