// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { initialAppSnapshot, type AppSnapshot } from '../shared/ipc';
import { SIDEBAR_SECTIONS } from './ui-model';

const whispreeMock = {
  getAppSnapshot: vi.fn<() => Promise<AppSnapshot>>(),
  subscribeAppSnapshot: vi.fn<(callback: (snapshot: AppSnapshot) => void) => () => void>(),
  enqueueMockDictation: vi.fn<() => Promise<unknown>>(),
  cancelForegroundJob: vi.fn<() => Promise<unknown>>(),
  openSettings: vi.fn<() => Promise<unknown>>(),
  requestPermission: vi.fn<() => Promise<unknown>>(),
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
  whispreeMock.cancelForegroundJob.mockResolvedValue({});
  whispreeMock.openSettings.mockResolvedValue({});
  whispreeMock.requestPermission.mockResolvedValue({});
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
    ]) {
      expect(html).toContain(`data-testid="${testId}"`);
    }
    expect(html).toContain('data-hotkey="cancel"');
    expect(html).toContain('esc');
    expect(html).toContain('Whispree');
    expect(html).not.toContain('Whispree Electron Migration');
    expect(html).not.toContain('window.whispree');
    expect(html).not.toContain('mock scaffold only');
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
    fireEvent.click(screen.getByRole('button', { name: /Cancel foreground/u }));
    expect(whispreeMock.enqueueMockDictation).toHaveBeenCalledTimes(1);
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

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
