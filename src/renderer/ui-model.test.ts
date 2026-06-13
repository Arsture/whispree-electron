import { describe, expect, it } from 'vitest';
import { initialAppSnapshot, type AppSnapshot } from '../shared/ipc';
import {
  SETTINGS_PLACEHOLDERS,
  SIDEBAR_SECTIONS,
  SWIFT_PARITY_CSS_CONTRACT,
  foregroundCancelLabel,
  overlayStatusText,
  queueProcessingText,
  sectionIds,
  statusTitle,
} from './ui-model';

describe('renderer Swift UI parity model', () => {
  it('keeps the legacy Swift sidebar order and icon tone semantics', () => {
    expect(sectionIds()).toEqual(['home', 'general', 'stt', 'llm', 'models', 'word-sets', 'history']);
    expect(SIDEBAR_SECTIONS.map((section) => section.label)).toEqual([
      'Home',
      '일반',
      'STT',
      'LLM',
      'Downloads',
      '단어 사전',
      '기록',
    ]);
    expect(SIDEBAR_SECTIONS.map((section) => section.iconTone)).toEqual([
      'orange',
      'gray',
      'blue',
      'purple',
      'green',
      'teal',
      'indigo',
    ]);
  });

  it('codifies the concrete Swift visual contract as CSS tokens', () => {
    expect(SWIFT_PARITY_CSS_CONTRACT).toMatchObject({
      sidebarExpanded: '220px',
      sidebarCollapsed: '80px',
      titlebarInset: '52px',
      cardRadius: '18px',
      overlayWidth: '280px',
      overlayRadius: '14px',
    });

  });

  it('preserves status priority and foreground cancel labels', () => {
    const processing: AppSnapshot = {
      ...initialAppSnapshot,
      appStatus: 'processing',
      queue: { ...initialAppSnapshot.queue, processingCount: 2, deliveryReadyCount: 1, foregroundJobSequence: 7 },
    };
    const recording: AppSnapshot = {
      ...processing,
      appStatus: 'recording',
      recording: { active: true, mode: 'mock', label: 'Mock recording in progress' },
    };

    expect(statusTitle(initialAppSnapshot)).toBe('Ready — press hotkey to record');
    expect(statusTitle(processing)).toBe('Processing mock dictation queue');
    expect(statusTitle(recording)).toBe('Mock recording in progress');
    expect(queueProcessingText(processing)).toContain('insertion remains FIFO');
    expect(queueProcessingText({
      ...initialAppSnapshot,
      recording: { active: false, mode: 'real', label: 'Real provider pipeline processing' },
      queue: { ...initialAppSnapshot.queue, processingCount: 1 },
    })).toBe('Processing your microphone dictation…');
    expect(overlayStatusText(processing)).toBe('Processing 2 items');
    expect(foregroundCancelLabel(processing)).toBe('Cancel #7');
    expect(foregroundCancelLabel(recording)).toBe('Cancel');
  });

  it('anchors settings placeholders to concrete Swift settings/history rows', () => {
    expect(SETTINGS_PLACEHOLDERS.general.flatMap((group) => group.rows)).toEqual(
      expect.arrayContaining(['Recording shortcut', 'Quick Fix shortcut', 'Browser Restoration', 'Terminal Restoration']),
    );
    expect(SETTINGS_PLACEHOLDERS.stt.flatMap((group) => group.rows)).toEqual(
      expect.arrayContaining(['Groq Cloud API', 'Parakeet MLX / mlx-audio', 'WhisperKit', '무음 자동 스킵']),
    );
    expect(SETTINGS_PLACEHOLDERS.llm.flatMap((group) => group.rows)).toEqual(
      expect.arrayContaining(['OpenAI 인증', '스크린샷 컨텍스트', '교정 모드', '시스템 프롬프트']),
    );
    expect(SETTINGS_PLACEHOLDERS.models.flatMap((group) => group.rows)).toContain('~/.cache/huggingface/hub/');
    expect(SETTINGS_PLACEHOLDERS['word-sets'].flatMap((group) => group.rows)).toEqual(
      expect.arrayContaining(['도메인 단어 세트', 'IT/Dev', '교정 매핑', '올바른 단어']),
    );
  });
});
