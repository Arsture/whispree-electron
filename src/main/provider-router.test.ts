import { describe, expect, it } from 'vitest';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';
import { SettingsProviderRouter } from './provider-router';

const credentialBoundary = { getSecret: async () => null };
const settings = (override: Partial<AppSettingsSnapshot> = {}) => ({ ...defaultAppSettings, ...override });

describe('SettingsProviderRouter', () => {
  it('selects real Groq providers only when settings choose Groq', () => {
    const router = new SettingsProviderRouter(() => settings({ sttProviderType: 'groq', llmProviderType: 'groq' }), credentialBoundary);

    expect(router.sttProvider().descriptor.id).toBe('groq-stt-runtime');
    expect(router.llmProvider().descriptor.id).toBe('groq-llm-runtime');
  });

  it('keeps unsupported local providers explicit instead of silently using MLX on Windows', async () => {
    const router = new SettingsProviderRouter(() => settings({ sttProviderType: 'mlx-audio', llmProviderType: 'local' }), credentialBoundary);

    await expect(router.sttProvider().transcribe({ jobId: '1', sequence: 1, language: 'ko', glossary: [], audioRef: { kind: 'memory', value: 'x' } })).rejects.toThrow('local STT sidecar');
    await expect(router.llmProvider().correct({ jobId: '1', sequence: 1, text: 'x', mode: 'standard', glossary: [], screenshotRefs: [] })).rejects.toThrow('local LLM sidecar');
  });
});
