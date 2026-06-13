import { app, BrowserWindow, Menu, Tray, clipboard, globalShortcut, ipcMain, nativeImage, shell, systemPreferences } from 'electron';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { IPC_CHANNELS } from '../shared/ipc';
import { resolveScreenshotCapturePath } from './screenshot-capture';
import {
  commandOk,
  rejectUnexpectedArgs,
  rejectUnexpectedSettingsArgs,
  settingsCommandError,
  settingsCommandOk,
  validatePermissionKindInput,
  validateRealRecordingStartInput,
  validateRecordedAudioInput,
} from './ipc-validation';
import { MockDictationPipeline } from './mock-pipeline';
import { createSettingsStore, type FileSettingsStore } from './settings-store';
import { createHistoryStore, type FileHistoryStore } from './history-store';
import { copyHistoryTextFromSnapshot } from './history-copy';
import { createAdapterSet, queryPermissionCardsForAdapterSet, type AdapterSet } from './adapters/adapter-factory';
import { RecordingController } from './recording-controller';
import { SettingsProviderRouter } from './provider-router';

const dirname = __dirname;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let settingsStore: FileSettingsStore | null = null;
let historyStore: FileHistoryStore | null = null;
let pipeline: MockDictationPipeline | null = null;
let adapterSet: AdapterSet | null = null;
let recordingController: RecordingController | null = null;
const emitAppSnapshot = (snapshot: ReturnType<MockDictationPipeline['getSnapshot']>) => {
  mainWindow?.webContents.send(IPC_CHANNELS.appSnapshotUpdated, snapshot);
};

configureSmokeRuntime();

if (isSquirrelStartupEvent()) {
  app.quit();
}

function isSquirrelStartupEvent(): boolean {
  return process.platform === 'win32' && process.argv.some((argument) => argument.startsWith('--squirrel-'));
}

function configureSmokeRuntime(): void {
  if (process.env.WHISPREE_USE_MOCK_KEYCHAIN === '1' || process.env.WHISPREE_SMOKE_MODE === 'packaged-app-ui') {
    app.commandLine.appendSwitch('use-mock-keychain');
  }

  const smokeUserDataDir = process.env.WHISPREE_USER_DATA_DIR;
  if (smokeUserDataDir) {
    app.setPath('userData', path.resolve(smokeUserDataDir));
  }
}

async function waitForRendererReady(): Promise<void> {
  if (!mainWindow) return;
  await mainWindow.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const isReady = () => {
        const shell = document.querySelector('[data-view="whispree-shell"]');
        return Boolean(shell)
          && shell?.getAttribute('data-settings-loaded') === 'true'
          && shell?.getAttribute('data-snapshot-loaded') === 'true'
          && document.body.innerText.includes('Whispree');
      };
      let attempts = 0;
      const finishAfterPaint = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
      const tick = () => {
        if (isReady() || attempts++ > 160) {
          finishAfterPaint();
          return;
        }
        setTimeout(tick, 50);
      };
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', tick, { once: true });
      } else {
        tick();
      }
    });
  `, true);
}

async function writeCaptureDomReport(reportPath: string | undefined): Promise<void> {
  if (!mainWindow || !reportPath) return;
  const repoRoot = process.env.WHISPREE_REPO_ROOT ?? app.getAppPath();
  const resolvedPath = path.resolve(repoRoot, reportPath);
  const report = await mainWindow.webContents.executeJavaScript(`
    JSON.stringify({
      title: document.title,
      rootPresent: Boolean(document.querySelector('[data-view="whispree-shell"]')),
      activePanel: document.querySelector('[role="tabpanel"][data-active="true"]')?.getAttribute('data-panel') ?? null,
      settingsLoaded: document.querySelector('[data-view="whispree-shell"]')?.getAttribute('data-settings-loaded') === 'true',
      snapshotLoaded: document.querySelector('[data-view="whispree-shell"]')?.getAttribute('data-snapshot-loaded') === 'true',
      bodyText: document.body.innerText.slice(0, 2000),
      capturedAt: new Date().toISOString(),
    }, null, 2);
  `, true);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${String(report)}\n`, 'utf8');
}

async function captureAndQuit(outputPath: string): Promise<void> {
  if (!mainWindow) return;
  try {
    mainWindow.show();
    mainWindow.focus();
    await waitForRendererReady();
    await writeCaptureDomReport(process.env.WHISPREE_CAPTURE_DOM_REPORT);
    const image = await mainWindow.webContents.capturePage();
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, image.toPNG());
  } finally {
    app.quit();
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 640,
    minWidth: 880,
    minHeight: 640,
    title: 'Whispree',
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 14, y: 14 },
        }
      : {}),
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
    repoRoot: process.env.WHISPREE_REPO_ROOT ?? app.getAppPath(),
    isPackaged: app.isPackaged,
    nodeEnv: process.env.NODE_ENV,
    allowPackagedCapture: process.env.WHISPREE_ALLOW_PACKAGED_SCREENSHOT === '1',
  });
  if (screenshotCapture.enabled) {
    mainWindow.webContents.once('did-finish-load', () => {
      void captureAndQuit(screenshotCapture.outputPath);
    });
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(withInitialSectionQuery(MAIN_WINDOW_VITE_DEV_SERVER_URL));
  } else {
    void mainWindow.loadFile(path.join(dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      query: initialSectionQuery(),
    });
  }
}

function initialSectionQuery(): Record<string, string> {
  const section = process.env.WHISPREE_INITIAL_SECTION;
  return section ? { initialSection: section } : {};
}

function withInitialSectionQuery(url: string): string {
  const section = process.env.WHISPREE_INITIAL_SECTION;
  if (!section) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('initialSection', section);
  return parsed.toString();
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

function getAdapterSet(): AdapterSet {
  adapterSet ??= createAdapterSet(process.platform, 'shell', {
    permissionBridge: systemPreferences,
    externalUrlOpener: shell,
    globalShortcutBridge: globalShortcut,
    clipboardBridge: clipboard,
  });
  return adapterSet;
}

async function initializeMainState(): Promise<void> {
  await getSettingsStore().load();
  const store = getHistoryStore();
  const history = await store.load();
  const adapters = getAdapterSet();
  const settings = getSettingsStore();
  const permissionCards = await queryPermissionCardsForAdapterSet(adapters);
  pipeline = new MockDictationPipeline(emitAppSnapshot, undefined, {
    historyStore: store,
    initialHistory: history,
    permissionCards,
    textInsertion: adapters.textInsertion,
    screenContext: adapters.screenContext,
    browserContext: adapters.browserContext,
    terminalContext: adapters.terminalContext,
    settingsProvider: () => settings.getSnapshot(),
    providerRouter: new SettingsProviderRouter(() => settings.getSnapshot(), settings, undefined, { platform: process.platform }),
  });
  recordingController = new RecordingController({
    pipeline,
    hotkeyAdapter: adapters.hotkey,
    shortcut: settings.getSnapshot().toggleRecordingShortcut.label,
  });
  if (shouldRegisterGlobalShortcuts()) {
    await recordingController.register().catch((error) => {
      pipeline?.refreshPermissions(permissionCards);
      console.warn(`Global shortcut registration failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
}

function shouldRegisterGlobalShortcuts(): boolean {
  return !process.env.WHISPREE_CAPTURE_SCREENSHOT;
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
  ipcMain.handle(IPC_CHANNELS.startRealRecording, (_event, input: unknown, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const snapshot = currentPipeline.getSnapshot();
    const rejected = rejectUnexpectedArgs('start-real-recording', snapshot, args);
    if (rejected) return rejected;
    const validation = validateRealRecordingStartInput(snapshot, input);
    if (!validation.ok) return validation.result;
    return commandOk('start-real-recording', currentPipeline.startRealRecording(validation.input), 'Real microphone recording started.');
  });
  ipcMain.handle(IPC_CHANNELS.submitRecordedAudio, (_event, input: unknown, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const snapshot = currentPipeline.getSnapshot();
    const rejected = rejectUnexpectedArgs('submit-recorded-audio', snapshot, args);
    if (rejected) return rejected;
    const validation = validateRecordedAudioInput(snapshot, input);
    if (!validation.ok) return validation.result;
    return commandOk('submit-recorded-audio', currentPipeline.submitRecordedAudio(validation.input), 'Captured audio submitted.');
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
    if (!mainWindow) createMainWindow();
    mainWindow?.show();
    return commandOk('open-settings', snapshot, 'Settings are available in the tabbed dashboard shell.');
  });

  ipcMain.handle(IPC_CHANNELS.copyHistoryText, (_event, historyId: unknown, variant: unknown, ...args: unknown[]) => {
    const snapshot = getPipeline().getSnapshot();
    const rejected = rejectUnexpectedArgs('copy-history-text', snapshot, args);
    if (rejected) return rejected;
    return copyHistoryTextFromSnapshot(snapshot, historyId, variant, clipboard);
  });

  ipcMain.handle(IPC_CHANNELS.clearHistory, async (_event, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const rejected = rejectUnexpectedArgs('clear-history', currentPipeline.getSnapshot(), args);
    if (rejected) return rejected;
    await getHistoryStore().clear();
    return commandOk('clear-history', currentPipeline.clearHistory(), 'Transcription history cleared.');
  });

  ipcMain.handle(IPC_CHANNELS.requestPermission, async (_event, kind: unknown, ...args: unknown[]) => {
    const currentPipeline = getPipeline();
    const snapshot = currentPipeline.getSnapshot();
    const rejected = rejectUnexpectedArgs('request-permission', snapshot, args);
    if (rejected) return rejected;
    const validation = validatePermissionKindInput(snapshot, kind);
    if (!validation.ok) return validation.result;
    const state = await getAdapterSet().permission.request(validation.kind);
    return commandOk('request-permission', currentPipeline.updatePermission(validation.kind, state), `${validation.kind} permission state: ${state}.`);
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

app.on('will-quit', () => {
  void recordingController?.unregister();
});
