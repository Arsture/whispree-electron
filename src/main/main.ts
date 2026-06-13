import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { IPC_CHANNELS, type PermissionKind } from '../shared/ipc';
import { MockDictationPipeline } from './mock-pipeline';

const dirname = __dirname;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const pipeline = new MockDictationPipeline((snapshot) => {
  mainWindow?.webContents.send(IPC_CHANNELS.appSnapshotUpdated, snapshot);
});

if (started) {
  app.quit();
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
      {
        label: 'Enqueue Mock Dictation',
        click: () => {
          pipeline.enqueueMockDictation();
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
  ipcMain.handle(IPC_CHANNELS.getAppSnapshot, () => pipeline.getSnapshot());
  ipcMain.handle(IPC_CHANNELS.enqueueMockDictation, () => pipeline.enqueueMockDictation());
  ipcMain.handle(IPC_CHANNELS.cancelForegroundJob, () => pipeline.cancelForegroundJob());
  ipcMain.handle(IPC_CHANNELS.openSettings, () => pipeline.getSnapshot());
  ipcMain.handle(IPC_CHANNELS.requestPermission, (_event, _kind: PermissionKind) => pipeline.getSnapshot());
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
