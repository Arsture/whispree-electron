import type { ImplementationStatus } from './status';

export type ProviderFamily = 'stt' | 'llm' | 'local-backend' | 'cloud-backend';
export type ProviderPlatform = 'cross-platform' | 'macos' | 'windows' | 'linux' | 'unknown';
export type LocalModelCapability = 'speech-to-text' | 'text-correction' | 'vision-correction';

export interface ProviderDescriptor {
  readonly id: string;
  readonly label: string;
  readonly family: ProviderFamily;
  readonly status: ImplementationStatus;
  readonly platform: ProviderPlatform;
  readonly detail: string;
}

export interface TranscriptionInput {
  readonly jobId: string;
  readonly sequence: number;
  readonly language: string;
  readonly glossary: readonly string[];
  readonly audioRef: { readonly kind: 'mock' | 'memory' | 'file'; readonly value: string };
}

export interface TranscriptionResult {
  readonly text: string;
  readonly metadata: {
    readonly providerId: string;
    readonly status: ImplementationStatus;
  };
}

export interface CorrectionInput {
  readonly jobId: string;
  readonly sequence: number;
  readonly text: string;
  readonly mode: string;
  readonly glossary: readonly string[];
  readonly screenshotRefs: readonly string[];
}

export interface CorrectionResult {
  readonly originalText: string;
  readonly correctedText: string;
  readonly metadata: {
    readonly providerId: string;
    readonly status: ImplementationStatus;
    readonly preservesOriginal: true;
  };
}

export interface STTProvider {
  readonly descriptor: ProviderDescriptor;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export interface LLMProvider {
  readonly descriptor: ProviderDescriptor;
  correct(input: CorrectionInput): Promise<CorrectionResult>;
}

export interface LocalModelBackend {
  readonly descriptor: ProviderDescriptor;
  readonly capabilities: readonly LocalModelCapability[];
  readonly runtime: 'mock' | 'mlx-python' | 'whisperkit-coreml' | 'windows-placeholder';
  readonly protocol: 'in-process' | 'stdio-json' | 'native-module' | 'unselected';
}

export class MockSTTProvider implements STTProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'mock-stt',
    label: 'Mock STT',
    family: 'stt',
    status: 'mock',
    platform: 'cross-platform',
    detail: 'Deterministic scaffold transcription provider.',
  };

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const glossarySuffix = input.glossary.length > 0 ? ` using ${input.glossary.join(', ')}` : '';
    return {
      text: `Mock transcript #${input.sequence}${glossarySuffix}`,
      metadata: {
        providerId: this.descriptor.id,
        status: this.descriptor.status,
      },
    };
  }
}

export class MockLLMProvider implements LLMProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'mock-llm',
    label: 'Mock Correction',
    family: 'llm',
    status: 'mock',
    platform: 'cross-platform',
    detail: 'Deterministic scaffold correction provider.',
  };

  async correct(input: CorrectionInput): Promise<CorrectionResult> {
    return {
      originalText: input.text,
      correctedText: `[corrected:${input.mode}] ${input.text}`,
      metadata: {
        providerId: this.descriptor.id,
        status: this.descriptor.status,
        preservesOriginal: true,
      },
    };
  }
}

export const localModelBackendRegistry: readonly LocalModelBackend[] = [
  {
    descriptor: {
      id: 'macos-mlx-sidecar',
      label: 'macOS MLX sidecar',
      family: 'local-backend',
      status: 'planned',
      platform: 'macos',
      detail: 'Future stdio JSON sidecar compatible with the copied mlx-worker protocols.',
    },
    capabilities: ['speech-to-text', 'text-correction', 'vision-correction'],
    runtime: 'mlx-python',
    protocol: 'stdio-json',
  },
  {
    descriptor: {
      id: 'macos-whisperkit',
      label: 'macOS WhisperKit/CoreML',
      family: 'local-backend',
      status: 'planned',
      platform: 'macos',
      detail: 'Future native/sidecar path for CoreML/ANE local STT.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisperkit-coreml',
    protocol: 'native-module',
  },
  {
    descriptor: {
      id: 'windows-local-placeholder',
      label: 'Windows local AI placeholder',
      family: 'local-backend',
      status: 'not-tested',
      platform: 'windows',
      detail: 'Interface exists; backend runtime is intentionally unselected in this milestone.',
    },
    capabilities: ['speech-to-text', 'text-correction'],
    runtime: 'windows-placeholder',
    protocol: 'unselected',
  },
];
