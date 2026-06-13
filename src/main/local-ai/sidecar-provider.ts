import type { CorrectionInput, CorrectionResult, LLMProvider, ProviderDescriptor, ProviderPlatform, STTProvider, TranscriptionInput, TranscriptionResult } from '../../shared/providers';
import type { SidecarResponse } from '../../shared/sidecar-protocol';
import { normalizeRuntimePlatform } from '../adapters/adapter-factory';
import { ProcessSidecarTransport } from './process-sidecar-transport';
import { SidecarClient } from './sidecar-client';
import { buildSidecarProcessSpec, selectLocalEngine, type LocalEngineDescriptor } from './engine-registry';

export interface LocalSidecarRuntimeOptions {
  readonly platform?: NodeJS.Platform | ProviderPlatform;
  readonly env?: NodeJS.ProcessEnv;
  readonly clientFactory?: (engine: LocalEngineDescriptor) => SidecarClient;
}

export function createLocalSTTProvider(preferredProviderType: 'whisperkit' | 'mlx-audio' | 'local', options: LocalSidecarRuntimeOptions = {}): STTProvider {
  const engine = requiredEngine({ platform: normalizePlatform(options.platform), capability: 'speech-to-text', preferredProviderType });
  return new SidecarSTTProvider(engine, options);
}

export function createLocalLLMProvider(options: LocalSidecarRuntimeOptions = {}): LLMProvider {
  const engine = requiredEngine({ platform: normalizePlatform(options.platform), capability: 'text-correction', preferredProviderType: 'local' });
  return new SidecarLLMProvider(engine, options);
}

class SidecarSTTProvider implements STTProvider {
  readonly descriptor: ProviderDescriptor;

  constructor(
    private readonly engine: LocalEngineDescriptor,
    private readonly options: LocalSidecarRuntimeOptions,
  ) {
    this.descriptor = runtimeDescriptor(engine, 'stt');
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const client = createClient(this.engine, this.options);
    try {
      const response = await client.request({ type: 'transcribe', audioRef: input.audioRef.value, language: input.language, glossary: input.glossary });
      if (response.type !== 'transcription') throw unexpectedSidecarResponse(response, 'transcription');
      return { text: response.text, metadata: { providerId: this.descriptor.id, status: this.descriptor.status } };
    } finally {
      client.dispose();
    }
  }
}

class SidecarLLMProvider implements LLMProvider {
  readonly descriptor: ProviderDescriptor;

  constructor(
    private readonly engine: LocalEngineDescriptor,
    private readonly options: LocalSidecarRuntimeOptions,
  ) {
    this.descriptor = runtimeDescriptor(engine, 'llm');
  }

  async correct(input: CorrectionInput): Promise<CorrectionResult> {
    const client = createClient(this.engine, this.options);
    try {
      const response = input.screenshotRefs.length > 0
        ? await client.request({ type: 'vision-correct', text: input.text, mode: input.mode, imageRefs: input.screenshotRefs, glossary: input.glossary, systemPrompt: input.systemPrompt })
        : await client.request({ type: 'correct', text: input.text, mode: input.mode, glossary: input.glossary, systemPrompt: input.systemPrompt });
      if (response.type !== 'correction') throw unexpectedSidecarResponse(response, 'correction');
      return {
        originalText: response.originalText,
        correctedText: response.correctedText,
        metadata: { providerId: this.descriptor.id, status: this.descriptor.status, preservesOriginal: true },
      };
    } finally {
      client.dispose();
    }
  }
}

function createClient(engine: LocalEngineDescriptor, options: LocalSidecarRuntimeOptions): SidecarClient {
  if (options.clientFactory) return options.clientFactory(engine);
  const spec = buildSidecarProcessSpec(engine, options.env);
  if (!spec) {
    throw new Error(`${engine.provider.label} is selected, but no stdio JSON sidecar command is configured. Set one of: ${engine.readinessEnvKeys.join(', ')}`);
  }
  return new SidecarClient(new ProcessSidecarTransport(spec));
}

function requiredEngine(input: Parameters<typeof selectLocalEngine>[0]): LocalEngineDescriptor {
  const engine = selectLocalEngine(input);
  if (!engine) throw new Error(`No local engine is registered for ${input.platform}/${input.capability}.`);
  if (input.platform === 'windows' && (engine.runtime === 'mlx-python' || engine.id.toLowerCase().includes('mlx'))) {
    throw new Error(`Windows local AI cannot use MLX engine: ${engine.id}`);
  }
  return engine;
}

function normalizePlatform(platform: LocalSidecarRuntimeOptions['platform']): ProviderPlatform {
  if (!platform) return normalizeRuntimePlatform(process.platform);
  if (platform === 'darwin' || platform === 'win32') return normalizeRuntimePlatform(platform);
  return platform as ProviderPlatform;
}

function runtimeDescriptor(engine: LocalEngineDescriptor, suffix: 'stt' | 'llm'): ProviderDescriptor {
  return {
    ...engine.provider,
    id: `${engine.id}-${suffix}`,
    family: suffix === 'stt' ? 'stt' : 'llm',
    status: 'partial',
    detail: `${engine.provider.detail} Runtime is executed through the shared stdio JSON sidecar provider.`,
  };
}

function unexpectedSidecarResponse(response: SidecarResponse, expected: string): Error {
  return new Error(`Expected ${expected} sidecar response, received ${response.type}.`);
}
