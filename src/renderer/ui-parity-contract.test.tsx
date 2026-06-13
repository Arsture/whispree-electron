// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

function installWhispreeMock() {
  whispreeMock.getAppSnapshot.mockResolvedValue(initialAppSnapshot);
  whispreeMock.subscribeAppSnapshot.mockReturnValue(vi.fn<() => void>());
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

describe('UI-16 renderer DOM and visual parity contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installWhispreeMock();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the Swift sidebar tab order with SF Symbol metadata and matching panels', () => {
    render(<App />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('data-tab'))).toEqual(SIDEBAR_SECTIONS.map((section) => section.id));
    expect(tabs.map((tab) => tab.getAttribute('data-swift-icon'))).toEqual(SIDEBAR_SECTIONS.map((section) => section.swiftIcon));
    expect(tabs.map((tab) => tab.getAttribute('data-icon-tone'))).toEqual(SIDEBAR_SECTIONS.map((section) => section.iconTone));

    for (const [index, section] of SIDEBAR_SECTIONS.entries()) {
      expect(tabs[index]).toHaveProperty('id', `tab-${section.id}`);
      expect(tabs[index]?.getAttribute('aria-controls')).toBe(`panel-${section.id}`);
      expect(document.getElementById(`panel-${section.id}`)?.getAttribute('data-panel')).toBe(section.id);
    }
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1]);
  });

  it('exposes key Korean labels across the integrated Wave 1 renderer shell', async () => {
    render(<App />);

    for (const label of ['일반', '단어 사전', '기록']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    expect(screen.getAllByText('Accessibility 권한 필요').length).toBeGreaterThan(0);
    expect(screen.getAllByText('스크린 컨텍스트').length).toBeGreaterThan(0);
    expect(screen.getAllByText('아직 녹음 없음 — 핫키를 눌러 녹음을 시작하세요').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: '일반' }));
    expect(await screen.findByText('사용자 정의 경로')).toBeTruthy();
    expect(screen.getByText('녹음 중 음악 일시정지')).toBeTruthy();
    expect(screen.getByText(/Automation 권한/u)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'STT' }));
    expect((await screen.findAllByText('음성 인식 엔진')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('무음 자동 스킵').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'LLM' }));
    expect((await screen.findAllByText('스크린샷 컨텍스트')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('에이전트에 전달').length).toBeGreaterThan(0);
    expect(screen.getAllByText('교정 모드').length).toBeGreaterThan(0);
    expect(screen.getAllByText('시스템 프롬프트').length).toBeGreaterThan(0);
  });

  it('keeps major mock surfaces available without importing standalone Wave 2 components', () => {
    render(<App />);

    for (const testId of [
      'recording-status',
      'screenshot-strip',
      'permissions',
      'latest-transcription',
      'providers',
      'queue-summary',
      'queue-list',
      'transcription-overlay',
      'overlay-waveform',
      'context-foundation',
      'ui-surface-gallery',
      'onboarding-mock',
      'quickfix-mock',
      'screenshot-selection-mock',
      'menubar-popover-mock',
    ]) {
      expect(screen.getByTestId(testId)).toBeTruthy();
    }

    const context = screen.getByTestId('context-foundation');
    expect(context.querySelector('[data-context-surface="quick-fix"]')).toBeTruthy();
    expect(context.querySelector('[data-context-surface="screenshot-selection"]')).toBeTruthy();
    const gallery = screen.getByTestId('ui-surface-gallery');
    for (const surface of ['onboarding', 'quick-fix', 'screenshot-selection', 'menubar']) {
      expect(gallery.querySelector(`[data-ui-surface="${surface}"]`)).toBeTruthy();
    }
    expect(within(screen.getByTestId('transcription-overlay')).getByText('UI-04')).toBeTruthy();
    expect(screen.getByLabelText('Screenshot context thumbnails').querySelectorAll('.screenshot-thumb')).toHaveLength(3);
  });
});
