import { describe, expect, it } from 'vitest';
import { defaultAppSettings } from './settings';
import { llmProviderChoices, providerStatusForSettings, selectedProviderDescriptors, sttProviderChoices } from './provider-registry';

describe('provider registry', () => {
  it('exposes credential-gated cloud choices without selecting real network by default', () => {
    const groqStt = sttProviderChoices.find((provider) => provider.id === 'groq-cloud-stt');
    const openai = llmProviderChoices.find((provider) => provider.id === 'openai-correction');

    expect(groqStt).toMatchObject({ requiresCredential: true, selectedStatus: 'credential-gated' });
    expect(openai).toMatchObject({ requiresCredential: true, selectedStatus: 'credential-gated' });
  });

  it('labels local providers as OS sidecars instead of implying Windows MLX', () => {
    expect(sttProviderChoices.find((provider) => provider.providerType === 'local')).toMatchObject({ label: 'OS Local Sidecar' });
    expect(llmProviderChoices.find((provider) => provider.providerType === 'local')).toMatchObject({ label: 'OS Local Sidecar' });
    expect(llmProviderChoices.find((provider) => provider.providerType === 'local')?.detail).toContain('Windows selects llama.cpp/ONNX');
  });

  it('selects descriptors from settings and keeps missing credentials gated', () => {
    const settings = { ...defaultAppSettings, sttProviderType: 'groq' as const, llmProviderType: 'openai' as const };
    const [stt, llm] = selectedProviderDescriptors(settings);

    expect(stt?.id).toBe('groq-cloud-stt');
    expect(llm?.id).toBe('openai-correction');
    expect(providerStatusForSettings(stt!, settings)).toBe('credential-gated');
    expect(providerStatusForSettings(llm!, settings)).toBe('credential-gated');
  });
});
