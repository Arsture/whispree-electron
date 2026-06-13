import type { LocalModelCapability, ProviderDescriptor, ProviderPlatform } from '../../shared/providers';

export type LocalEngineRuntime = 'mlx-python' | 'whisperkit-coreml' | 'whisper-cpp' | 'onnx-directml' | 'llama-cpp';
export type LocalEngineProtocol = 'stdio-json' | 'native-module' | 'http-local';

export interface LocalEngineDescriptor {
  readonly id: string;
  readonly provider: ProviderDescriptor;
  readonly capabilities: readonly LocalModelCapability[];
  readonly runtime: LocalEngineRuntime;
  readonly protocol: LocalEngineProtocol;
  readonly commandCandidates: readonly string[];
  readonly readinessEnvKeys: readonly string[];
}

export const localEngineRegistry: readonly LocalEngineDescriptor[] = [
  {
    id: 'macos-mlx-audio-worker',
    provider: {
      id: 'macos-mlx-audio-worker',
      label: 'macOS MLX Audio sidecar',
      family: 'local-backend',
      status: 'planned',
      platform: 'macos',
      detail: 'macOS-only MLX Python worker behind the stdio JSON sidecar protocol.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'mlx-python',
    protocol: 'stdio-json',
    commandCandidates: ['uv', 'python3'],
    readinessEnvKeys: ['WHISPREE_MLX_AUDIO_COMMAND'],
  },
  {
    id: 'macos-whisperkit-coreml',
    provider: {
      id: 'macos-whisperkit-coreml',
      label: 'macOS WhisperKit/CoreML',
      family: 'local-backend',
      status: 'planned',
      platform: 'macos',
      detail: 'macOS CoreML/ANE local STT path isolated behind a native-module adapter seam.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisperkit-coreml',
    protocol: 'native-module',
    commandCandidates: [],
    readinessEnvKeys: ['WHISPREE_WHISPERKIT_HELPER'],
  },
  {
    id: 'windows-whisper-cpp-directml',
    provider: {
      id: 'windows-whisper-cpp-directml',
      label: 'Windows whisper.cpp DirectML/CUDA sidecar',
      family: 'local-backend',
      status: 'not-tested',
      platform: 'windows',
      detail: 'Windows STT candidate that avoids MLX and can be selected behind the same sidecar protocol once tested on Windows.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisper-cpp',
    protocol: 'stdio-json',
    commandCandidates: ['whisper-cli.exe', 'main.exe', 'whisper-cli'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_WHISPER_CPP_COMMAND'],
  },
  {
    id: 'windows-onnx-directml',
    provider: {
      id: 'windows-onnx-directml',
      label: 'Windows ONNX Runtime DirectML sidecar',
      family: 'local-backend',
      status: 'not-tested',
      platform: 'windows',
      detail: 'Windows GPU-backed local AI candidate for STT/correction; intentionally not MLX and not claimed ready until Windows execution exists.',
    },
    capabilities: ['speech-to-text', 'text-correction'],
    runtime: 'onnx-directml',
    protocol: 'stdio-json',
    commandCandidates: ['python.exe', 'onnxruntime_perf_test.exe'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_ONNX_COMMAND'],
  },
  {
    id: 'windows-llama-cpp-vulkan',
    provider: {
      id: 'windows-llama-cpp-vulkan',
      label: 'Windows llama.cpp Vulkan/CUDA sidecar',
      family: 'local-backend',
      status: 'not-tested',
      platform: 'windows',
      detail: 'Windows local correction/VLM candidate behind stdio JSON; not MLX and not marked ready without Windows hardware evidence.',
    },
    capabilities: ['text-correction', 'vision-correction'],
    runtime: 'llama-cpp',
    protocol: 'stdio-json',
    commandCandidates: ['llama-cli.exe', 'llama-server.exe', 'llama-cli'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_LLAMA_CPP_COMMAND'],
  },
];

export function localEnginesForPlatform(platform: ProviderPlatform, capability?: LocalModelCapability): readonly LocalEngineDescriptor[] {
  return localEngineRegistry.filter((engine) => {
    const platformMatches = engine.provider.platform === platform || engine.provider.platform === 'cross-platform';
    const capabilityMatches = capability ? engine.capabilities.includes(capability) : true;
    return platformMatches && capabilityMatches;
  });
}

export function assertWindowsEnginesAvoidMlx(): boolean {
  return localEnginesForPlatform('windows').every((engine) => engine.runtime !== 'mlx-python' && !engine.id.includes('mlx'));
}
