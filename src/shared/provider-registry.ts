import type { AppSettingsSnapshot, LLMProviderType, STTProviderType } from './settings';
import type { ImplementationStatus } from './status';
import type { ProviderDescriptor } from './providers';

export interface ProviderChoiceDescriptor extends ProviderDescriptor {
  readonly providerType: STTProviderType | LLMProviderType;
  readonly requiresCredential: boolean;
  readonly selectedStatus: ImplementationStatus | 'credential-gated';
}

export const sttProviderChoices: readonly ProviderChoiceDescriptor[] = [
  {
    id: 'mock-stt',
    label: 'Mock STT',
    family: 'stt',
    status: 'mock',
    selectedStatus: 'mock',
    platform: 'cross-platform',
    providerType: 'mock',
    requiresCredential: false,
    detail: 'Deterministic scaffold provider; no microphone or cloud request.',
  },
  {
    id: 'whisperkit-stt',
    label: 'WhisperKit',
    family: 'stt',
    status: 'planned',
    selectedStatus: 'planned',
    platform: 'macos',
    providerType: 'whisperkit',
    requiresCredential: false,
    detail: 'macOS CoreML/ANE local STT path; implemented later behind adapter/sidecar boundary.',
  },
  {
    id: 'groq-cloud-stt',
    label: 'Groq Cloud API',
    family: 'cloud-backend',
    status: 'planned',
    selectedStatus: 'credential-gated',
    platform: 'cross-platform',
    providerType: 'groq',
    requiresCredential: true,
    detail: 'OpenAI-compatible Groq transcription request builder; real network is credential-gated.',
  },
  {
    id: 'mlx-audio-stt',
    label: 'MLX Audio',
    family: 'local-backend',
    status: 'planned',
    selectedStatus: 'planned',
    platform: 'macos',
    providerType: 'mlx-audio',
    requiresCredential: false,
    detail: 'macOS/Apple Silicon mlx-audio sidecar path; Windows equivalent is not selected.',
  },
];

export const llmProviderChoices: readonly ProviderChoiceDescriptor[] = [
  {
    id: 'none-correction',
    label: '없음 (원문 사용)',
    family: 'llm',
    status: 'planned',
    selectedStatus: 'planned',
    platform: 'cross-platform',
    providerType: 'none',
    requiresCredential: false,
    detail: 'Delivery uses STT text without LLM correction.',
  },
  {
    id: 'mock-llm',
    label: 'Mock Correction',
    family: 'llm',
    status: 'mock',
    selectedStatus: 'mock',
    platform: 'cross-platform',
    providerType: 'mock',
    requiresCredential: false,
    detail: 'Deterministic correction placeholder for tests and offline development.',
  },
  {
    id: 'local-mlx-llm',
    label: '로컬 MLX',
    family: 'local-backend',
    status: 'planned',
    selectedStatus: 'planned',
    platform: 'macos',
    providerType: 'local',
    requiresCredential: false,
    detail: 'macOS MLX text/vision sidecar path; Windows local backend remains unselected.',
  },
  {
    id: 'openai-correction',
    label: 'OpenAI (GPT)',
    family: 'cloud-backend',
    status: 'planned',
    selectedStatus: 'credential-gated',
    platform: 'cross-platform',
    providerType: 'openai',
    requiresCredential: true,
    detail: 'OpenAI Responses API request builder; real calls require a credential boundary.',
  },
  {
    id: 'groq-cloud-llm',
    label: 'Groq Cloud',
    family: 'cloud-backend',
    status: 'planned',
    selectedStatus: 'credential-gated',
    platform: 'cross-platform',
    providerType: 'groq',
    requiresCredential: true,
    detail: 'Groq OpenAI-compatible chat completion request builder; real calls require a credential boundary.',
  },
];

export function selectedProviderDescriptors(settings: AppSettingsSnapshot): readonly ProviderChoiceDescriptor[] {
  return [
    sttProviderChoices.find((provider) => provider.providerType === settings.sttProviderType) ?? sttProviderChoices[0]!,
    llmProviderChoices.find((provider) => provider.providerType === settings.llmProviderType) ?? llmProviderChoices[0]!,
  ];
}

export function providerStatusForSettings(provider: ProviderChoiceDescriptor, settings: AppSettingsSnapshot): ImplementationStatus | 'credential-gated' {
  if (!provider.requiresCredential) return provider.selectedStatus;
  if (provider.providerType === 'groq' && settings.groqApiKeyConfigured) return provider.status;
  if (provider.providerType === 'openai') return 'credential-gated';
  return 'credential-gated';
}
