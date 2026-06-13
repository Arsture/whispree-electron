import { MockLLMProvider, MockSTTProvider, type LLMProvider, type STTProvider } from '../shared/providers';
import type { AppSettingsSnapshot } from '../shared/settings';
import { GroqCorrectionProvider, GroqTranscriptionProvider, NoopCorrectionProvider, OpenAIResponsesCorrectionProvider, type FetchLike, type SettingsSnapshotProvider } from './cloud-provider-executor';
import type { CloudCredentialBoundary } from './cloud-provider-requests';

export interface ProviderRouter {
  sttProvider(): STTProvider;
  llmProvider(): LLMProvider;
}

export class SettingsProviderRouter implements ProviderRouter {
  constructor(
    private readonly settings: SettingsSnapshotProvider,
    private readonly credentials: CloudCredentialBoundary,
    private readonly fetchImpl?: FetchLike,
  ) {}

  sttProvider(): STTProvider {
    const settings = this.settings();
    if (settings.sttProviderType === 'groq') return new GroqTranscriptionProvider(this.credentials, this.settings, this.fetchImpl);
    if (settings.sttProviderType === 'mock') return new MockSTTProvider();
    return new UnavailableSTTProvider(settings.sttProviderType);
  }

  llmProvider(): LLMProvider {
    const settings = this.settings();
    if (!settings.llmEnabled || settings.llmProviderType === 'none') return new NoopCorrectionProvider();
    if (settings.llmProviderType === 'groq') return new GroqCorrectionProvider(this.credentials, this.settings, this.fetchImpl);
    if (settings.llmProviderType === 'openai') return new OpenAIResponsesCorrectionProvider(this.credentials, this.settings, this.fetchImpl);
    if (settings.llmProviderType === 'mock') return new MockLLMProvider();
    return new UnavailableLLMProvider(settings.llmProviderType);
  }
}

export class StaticProviderRouter implements ProviderRouter {
  constructor(
    private readonly stt: STTProvider = new MockSTTProvider(),
    private readonly llm: LLMProvider = new MockLLMProvider(),
  ) {}

  sttProvider(): STTProvider {
    return this.stt;
  }

  llmProvider(): LLMProvider {
    return this.llm;
  }
}

class UnavailableSTTProvider implements STTProvider {
  readonly descriptor = {
    id: 'unavailable-local-stt',
    label: 'Unavailable local STT sidecar',
    family: 'stt' as const,
    status: 'not-tested' as const,
    platform: 'unknown' as const,
    detail: 'Selected local STT backend needs an installed sidecar and platform-specific execution evidence.',
  };

  constructor(private readonly providerType: AppSettingsSnapshot['sttProviderType']) {}

  async transcribe(): Promise<never> {
    throw new Error(`${this.providerType} is selected, but the local STT sidecar is not configured or tested on this host.`);
  }
}

class UnavailableLLMProvider implements LLMProvider {
  readonly descriptor = {
    id: 'unavailable-local-llm',
    label: 'Unavailable local LLM sidecar',
    family: 'llm' as const,
    status: 'not-tested' as const,
    platform: 'unknown' as const,
    detail: 'Selected local LLM backend needs an installed sidecar and platform-specific execution evidence.',
  };

  constructor(private readonly providerType: AppSettingsSnapshot['llmProviderType']) {}

  async correct(): Promise<never> {
    throw new Error(`${this.providerType} correction is selected, but the local LLM sidecar is not configured or tested on this host.`);
  }
}
