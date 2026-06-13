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
  readonly runtime: 'mock' | 'mlx-python' | 'whisperkit-coreml' | 'whisper-cpp' | 'onnx-directml' | 'llama-cpp';
  readonly protocol: 'in-process' | 'stdio-json' | 'native-module' | 'http-local' | 'unselected';
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
      status: 'partial',
      platform: 'macos',
      detail: 'macOS stdio JSON sidecar compatible with copied MLX worker protocols.',
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
      status: 'partial',
      platform: 'macos',
      detail: 'macOS native/sidecar path for CoreML/ANE local STT.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisperkit-coreml',
    protocol: 'native-module',
  },
  {
    descriptor: {
      id: 'windows-whisper-cpp-directml',
      label: 'Windows whisper.cpp DirectML/CUDA',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows STT sidecar candidate using whisper.cpp DirectML/CUDA builds; never MLX.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisper-cpp',
    protocol: 'stdio-json',
  },
  {
    descriptor: {
      id: 'windows-onnx-directml',
      label: 'Windows ONNX Runtime DirectML',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows STT/correction sidecar candidate using ONNX Runtime DirectML; never MLX.',
    },
    capabilities: ['speech-to-text', 'text-correction'],
    runtime: 'onnx-directml',
    protocol: 'stdio-json',
  },
  {
    descriptor: {
      id: 'windows-llama-cpp-vulkan',
      label: 'Windows llama.cpp Vulkan/CUDA',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows correction/VLM sidecar candidate using llama.cpp Vulkan/CUDA builds; never MLX.',
    },
    capabilities: ['text-correction', 'vision-correction'],
    runtime: 'llama-cpp',
    protocol: 'stdio-json',
  },
];
