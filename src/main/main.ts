import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from 'electron';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { IPC_CHANNELS } from '../shared/ipc';
import { resolveScreenshotCapturePath } from './screenshot-capture';
import { commandError, commandOk, rejectUnexpectedArgs, validatePermissionKindInput } from './ipc-validation';
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
  ipcMain.handle(IPC_CHANNELS.enqueueMockDictation, (_event, ...args: unknown[]) => {
    const rejected = rejectUnexpectedArgs('enqueue-mock-dictation', pipeline.getSnapshot(), args);
    if (rejected) return rejected;
    return commandOk('enqueue-mock-dictation', pipeline.enqueueMockDictation(), 'Mock dictation enqueued.');
  });
  ipcMain.handle(IPC_CHANNELS.cancelForegroundJob, (_event, ...args: unknown[]) => {
    const rejected = rejectUnexpectedArgs('cancel-foreground-job', pipeline.getSnapshot(), args);
    if (rejected) return rejected;
    return commandOk('cancel-foreground-job', pipeline.cancelForegroundJob(), 'Foreground mock scope canceled.');
  });
  ipcMain.handle(IPC_CHANNELS.openSettings, (_event, ...args: unknown[]) => {
    const rejected = rejectUnexpectedArgs('open-settings', pipeline.getSnapshot(), args);
    if (rejected) return rejected;
    return commandError('open-settings', pipeline.getSnapshot(), 'Settings window is planned after the dashboard shell.', 'not-implemented');
  });
  ipcMain.handle(IPC_CHANNELS.requestPermission, (_event, kind: unknown, ...args: unknown[]) => {
    const snapshot = pipeline.getSnapshot();
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
