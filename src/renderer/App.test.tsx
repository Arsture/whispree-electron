// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { initialAppSnapshot, type AppSnapshot } from '../shared/ipc';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';
import { SIDEBAR_SECTIONS } from './ui-model';

const whispreeMock = {
  getAppSnapshot: vi.fn<() => Promise<AppSnapshot>>(),
  subscribeAppSnapshot: vi.fn<(callback: (snapshot: AppSnapshot) => void) => () => void>(),
  enqueueMockDictation: vi.fn<() => Promise<unknown>>(),
  startRealRecording: vi.fn<() => Promise<unknown>>(),
  stopRealRecording: vi.fn<() => Promise<unknown>>(),
  cancelForegroundJob: vi.fn<() => Promise<unknown>>(),
  openSettings: vi.fn<() => Promise<unknown>>(),
  requestPermission: vi.fn<(kind: AppSnapshot['permissions'][number]['kind']) => Promise<unknown>>(),
  getSettings: vi.fn<() => Promise<AppSettingsSnapshot>>(),
  updateSettings: vi.fn<(update: unknown) => Promise<unknown>>(),
  resetSettings: vi.fn<() => Promise<unknown>>(),
  copyHistoryText: vi.fn<(historyId: string, variant: 'original' | 'corrected') => Promise<unknown>>(),
};

let snapshotCallback: ((snapshot: AppSnapshot) => void) | null = null;
let unsubscribe: ReturnType<typeof vi.fn<() => void>>;

function installWhispreeMock() {
  snapshotCallback = null;
  unsubscribe = vi.fn<() => void>();
  whispreeMock.getAppSnapshot.mockResolvedValue(initialAppSnapshot);
  whispreeMock.subscribeAppSnapshot.mockImplementation((callback) => {
    snapshotCallback = callback;
    return unsubscribe;
  });
  whispreeMock.enqueueMockDictation.mockResolvedValue({});
  whispreeMock.startRealRecording.mockResolvedValue({});
  whispreeMock.stopRealRecording.mockResolvedValue({});
  whispreeMock.cancelForegroundJob.mockResolvedValue({});
  whispreeMock.openSettings.mockResolvedValue({});
  whispreeMock.requestPermission.mockResolvedValue({});
  whispreeMock.getSettings.mockResolvedValue(defaultAppSettings);
  whispreeMock.updateSettings.mockResolvedValue({ ok: true, settings: defaultAppSettings });
  whispreeMock.resetSettings.mockResolvedValue({ ok: true, settings: defaultAppSettings });
  whispreeMock.copyHistoryText.mockResolvedValue({});
  Object.defineProperty(window, 'whispree', {
    configurable: true,
    value: whispreeMock,
  });
}

describe('App Swift parity shell markup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installWhispreeMock();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a tabbed glass shell with stable DOM contracts', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('data-view="whispree-shell"');
    expect(html).toContain('role="tablist"');
    for (const section of SIDEBAR_SECTIONS) {
      expect(html).toContain(`data-tab="${section.id}"`);
      expect(html).toContain(`data-icon-tone="${section.iconTone}"`);
      expect(html).toContain(`data-panel="${section.id}"`);
    }
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('data-panel="home"');
    expect(html).toContain('data-visited="true"');
    expect(html).toContain('data-visited="false"');
  });

  it('renders dashboard sections, overlay keycaps, and no migration-scaffold copy', () => {
    const html = renderToStaticMarkup(<App />);

    for (const testId of [
      'recording-status',
      'queue-summary',
      'latest-transcription',
      'providers',
      'permissions',
      'transcription-overlay',
      'overlay-waveform',
      'queue-list',
      'context-foundation',
    ]) {
      expect(html).toContain(`data-testid="${testId}"`);
    }
    expect(html).toContain('data-hotkey="cancel"');
    expect(html).toContain('data-context-surface="quick-fix"');
    expect(html).toContain('data-context-surface="screenshot-selection"');
    expect(html).toContain('provider status');
    expect(html).not.toContain('waiting for mock provider');
    expect(html).toContain('esc');
    expect(html).toContain('Whispree');
    expect(html).not.toContain('Whispree Electron Migration');
    expect(html).not.toContain('window.whispree');
    expect(html).not.toContain('mock scaffold only');
  });



  it('renders neutral provider/queue copy when processing provenance is unknown', async () => {
    const processingSnapshot: AppSnapshot = {
      ...initialAppSnapshot,
      appStatus: 'processing',
      queue: {
        ...initialAppSnapshot.queue,
        totalCount: 1,
        processingCount: 1,
        foregroundJobSequence: 1,
        items: [
          {
            id: 'job-1',
            sequence: 1,
            status: 'transcribing',
            originalText: '',
            correctedText: '',
            targetContextId: null,
            screenshotIds: [],
            isDeliverable: false,
            isProcessing: true,
            isTerminal: false,
          },
        ],
      },
      providers: [
        ...initialAppSnapshot.providers,
        {
          id: 'groq-llm-runtime',
          label: 'Groq Cloud Correction',
          family: 'llm',
          status: 'partial',
          platform: 'cross-platform',
          detail: 'Real provider path is available when credentials exist.',
        },
      ],
    };
    whispreeMock.getAppSnapshot.mockResolvedValue(processingSnapshot);
    render(<App />);

    await screen.findByText('Processing dictation queue');
    expect(screen.getByText('waiting for provider')).toBeTruthy();
    expect(screen.getByText('provider status')).toBeTruthy();
    expect(screen.queryByText('Processing mock dictation queue')).toBeNull();
    expect(screen.queryByText('waiting for mock provider')).toBeNull();
  });


  it('renders Swift-anchored settings controls and updates through typed settings IPC', async () => {
    render(<App />);
    await screen.findByText('Ready — press hotkey to record');

    fireEvent.click(screen.getByRole('tab', { name: /일반/u }));
    expect(screen.getByText('Recording shortcut')).toBeTruthy();
    expect(screen.getByText('⌃⇧R')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Toggle — Press to start/u));
    expect(whispreeMock.updateSettings).toHaveBeenCalledWith({ recordingMode: 'toggle' });

    fireEvent.click(screen.getByRole('tab', { name: /STT/u }));
    expect(screen.getAllByText('WhisperKit Large V3 Turbo').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('음성 인식 엔진'), { target: { value: 'groq' } });
    expect(whispreeMock.updateSettings).toHaveBeenCalledWith({ sttProviderType: 'groq' });

    fireEvent.click(screen.getByRole('tab', { name: /LLM/u }));
    fireEvent.change(screen.getByLabelText('교정 모드'), { target: { value: 'structured' } });
    expect(whispreeMock.updateSettings).toHaveBeenCalledWith({ correctionMode: 'structured' });
  });



  it('dispatches every permission row through typed IPC requestPermission only', async () => {
    const permissionsSnapshot: AppSnapshot = {
      ...initialAppSnapshot,
      permissions: [
        { kind: 'microphone', label: 'Microphone', state: 'prompt-required', status: 'partial', detail: 'mic' },
        { kind: 'accessibility', label: 'Accessibility', state: 'manual-required', status: 'partial', detail: 'ax' },
        { kind: 'screen-recording', label: 'Screen Recording', state: 'manual-required', status: 'partial', detail: 'screen' },
        { kind: 'browser-context', label: 'Browser Context', state: 'manual-required', status: 'partial', detail: 'browser' },
        { kind: 'terminal-context', label: 'Terminal Context', state: 'manual-required', status: 'partial', detail: 'terminal' },
      ],
    };
    whispreeMock.getAppSnapshot.mockResolvedValue(permissionsSnapshot);
    render(<App />);
    await screen.findByText('Browser Context');

    for (const button of screen.getAllByRole('button', { name: /Request/u })) {
      fireEvent.click(button);
    }

    expect(whispreeMock.requestPermission.mock.calls.map((call) => call[0])).toEqual([
      'microphone',
      'accessibility',
      'screen-recording',
      'browser-context',
      'terminal-context',
    ]);
  });

  it('supports sidebar selection, collapse, keyboard navigation, commands, and subscription cleanup', async () => {
    const { container, unmount } = render(<App />);
    await screen.findByText('Ready — press hotkey to record');

    const shell = container.querySelector('[data-view="whispree-shell"]');
    expect(shell?.getAttribute('data-sidebar-collapsed')).toBe('false');
    expect(screen.getByRole('tab', { name: /Home/u }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name: /LLM/u }));
    expect(screen.getByRole('tab', { name: /LLM/u }).getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-panel="home"]')?.getAttribute('data-visited')).toBe('true');
    expect(container.querySelector('[data-panel="llm"]')?.getAttribute('data-visited')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Collapse sidebar/u }));
    expect(shell?.getAttribute('data-sidebar-collapsed')).toBe('true');
    expect(screen.getByRole('tab', { name: /LLM/u }).getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(screen.getByRole('tab', { name: /LLM/u }), { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /DL/u }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name: /Home/u }));
    fireEvent.click(screen.getByRole('button', { name: /Start mock recording/u }));
    fireEvent.click(screen.getByRole('button', { name: /Start real recording/u }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel foreground/u }));
    expect(whispreeMock.enqueueMockDictation).toHaveBeenCalledTimes(1);
    expect(whispreeMock.startRealRecording).toHaveBeenCalledTimes(1);
    expect(whispreeMock.cancelForegroundJob).toHaveBeenCalledTimes(1);

    const delivered: AppSnapshot = {
      ...initialAppSnapshot,
      history: [
        {
          id: 'history-1',
          sequence: 1,
          originalText: 'hello whispree',
          correctedText: 'hello Whispree',
          deliveredAtIso: new Date(0).toISOString(),
          status: 'delivered',
        },
      ],
      latest: { originalText: 'hello whispree', correctedText: 'hello Whispree' },
    };
    await act(async () => {
      snapshotCallback?.(delivered);
    });
    expect(screen.getAllByText('hello Whispree').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: /기록/u }));
    fireEvent.click(screen.getByRole('button', { name: /원본/u }));
    expect(whispreeMock.copyHistoryText).toHaveBeenCalledWith('history-1', 'original');

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
