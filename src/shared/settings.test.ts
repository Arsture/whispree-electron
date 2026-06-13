import { describe, expect, it } from 'vitest';
import {
  applySettingsUpdate,
  defaultAppSettings,
  defaultPersistedAppSettings,
  normalizeCorrectionMode,
  normalizeLLMProviderType,
  normalizeOpenAIModel,
  normalizePersistedSettings,
  normalizeSTTProviderType,
  redactSettings,
  validateSettingsUpdate,
} from './settings';

describe('App settings schema', () => {
  it('mirrors effective Swift defaults without exposing secrets', () => {
    expect(defaultPersistedAppSettings).toMatchObject({
      recordingMode: 'push-to-talk',
      language: 'ko',
      llmEnabled: true,
      hasCompletedOnboarding: false,
      launchAtLogin: false,
      showOverlay: true,
      correctionMode: 'standard',
      whisperModelId: 'openai_whisper-large-v3_turbo',
      llmModelId: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
      mlxAudioModelId: 'mlx-community/Qwen3-ASR-1.7B-8bit',
      sttProviderType: 'whisperkit',
      llmProviderType: 'none',
      openaiModel: 'gpt-5.5',
      groqLLMModel: 'qwen/qwen3-32b',
      screenshotContextEnabled: false,
      screenshotPasteEnabled: false,
      audioInputChannel: 0,
      vadEnabled: true,
      pauseMediaDuringRecording: true,
      restoreBrowserTab: true,
      restoreTerminalContext: true,
    });
    expect(defaultAppSettings.groqApiKeyConfigured).toBe(false);
    expect(JSON.stringify(defaultAppSettings)).not.toContain('gsk_');
  });

  it('normalizes Swift and legacy aliases', () => {
    expect(normalizeCorrectionMode('promptEngineering')).toBe('filler-removal');
    expect(normalizeCorrectionMode('fillerRemoval')).toBe('filler-removal');
    expect(normalizeSTTProviderType('WhisperKit')).toBe('whisperkit');
    expect(normalizeSTTProviderType('MLX Audio')).toBe('mlx-audio');
    expect(normalizeLLMProviderType('로컬 LLM (Qwen3)')).toBe('local');
    expect(normalizeLLMProviderType('OpenAI (GPT)')).toBe('openai');
    expect(normalizeOpenAIModel('gpt-5.3-codex-spark')).toBe('gpt-5.4-mini');
    expect(normalizeOpenAIModel('gpt-5.2-codex')).toBe('gpt-5.2');
  });

  it('applies Swift field migrations for Qwen2.5 and screenshot paste', () => {
    const normalized = normalizePersistedSettings({
      llmModelId: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
      isScreenshotContextEnabled: false,
      isScreenshotPasteEnabled: true,
    });

    expect(normalized.llmModelId).toBe(defaultPersistedAppSettings.llmModelId);
    expect(normalized.screenshotContextEnabled).toBe(false);
    expect(normalized.screenshotPasteEnabled).toBe(false);
  });

  it('redacts transient Groq API key metadata into a configured flag', () => {
    const publicSettings = redactSettings(defaultPersistedAppSettings, { groqApiKey: 'gsk_test_123' });

    expect(publicSettings.groqApiKeyConfigured).toBe(true);
    expect(JSON.stringify(publicSettings)).not.toContain('gsk_test_123');
    expect(JSON.stringify(defaultPersistedAppSettings)).not.toContain('gsk_test_123');
  });

  it('validates updates and rejects unknown or invalid values', () => {
    expect(validateSettingsUpdate({ recordingMode: 'toggle', groqApiKey: 'gsk_test' })).toEqual({
      ok: true,
      update: { recordingMode: 'toggle', groqApiKey: 'gsk_test' },
    });
    expect(validateSettingsUpdate({ unknown: true })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ recordingMode: 'bad-mode' })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ audioInputChannel: -1 })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ llmEnabled: 'yes' })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ domainWordSets: [{ id: 'set', name: 'Words', words: ['Codex'], corrections: [], isEnabled: true }] })).toEqual({
      ok: true,
      update: { domainWordSets: [{ id: 'set', name: 'Words', words: ['Codex'], corrections: [], isEnabled: true }] },
    });
    expect(validateSettingsUpdate({ domainWordSets: [{ id: 1, name: 'Words', words: ['ok', 7], corrections: [], isEnabled: true }] })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ domainWordSets: [{ id: 'set', name: 'Words', words: ['Codex'], corrections: [{ id: 'c1', from: 'codex', to: 42 }], isEnabled: true }] })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate({ correctionMappings: [{ id: 'm1', from: 'whisper', to: 'Whispree' }] })).toEqual({
      ok: true,
      update: { correctionMappings: [{ id: 'm1', from: 'whisper', to: 'Whispree' }] },
    });
    expect(validateSettingsUpdate({ correctionMappings: [{ id: 'm1', from: null, to: 'Whispree' }] })).toMatchObject({ ok: false });
    expect(validateSettingsUpdate(null)).toMatchObject({ ok: false });
  });

  it('updates immutable snapshots without mutating current settings', () => {
    const current = defaultPersistedAppSettings;
    const next = applySettingsUpdate(current, { recordingMode: 'toggle', groqApiKey: 'gsk_test' });

    expect(current.recordingMode).toBe('push-to-talk');
    expect(JSON.stringify(current)).not.toContain('gsk_test');
    expect(next.recordingMode).toBe('toggle');
    expect(JSON.stringify(next)).not.toContain('gsk_test');
  });
});
