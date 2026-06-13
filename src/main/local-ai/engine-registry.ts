import type { LocalModelCapability, ProviderDescriptor, ProviderPlatform } from '../../shared/providers';
import type { SidecarProcessSpec } from './process-sidecar-transport';

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
  readonly defaultArgs: readonly string[];
}

export interface LocalEngineSelectionInput {
  readonly platform: ProviderPlatform;
  readonly capability: LocalModelCapability;
  readonly preferredProviderType?: 'whisperkit' | 'mlx-audio' | 'local' | 'mock' | 'groq' | 'none' | 'openai';
}

export interface LocalEngineReadiness {
  readonly engine: LocalEngineDescriptor;
  readonly status: 'configured' | 'candidate' | 'missing-command' | 'unsupported-protocol';
  readonly command: string | null;
  readonly source: 'env' | 'candidate' | 'none';
  readonly envKey: string | null;
  readonly message: string;
}

export const localEngineRegistry: readonly LocalEngineDescriptor[] = [
  {
    id: 'macos-mlx-audio-worker',
    provider: {
      id: 'macos-mlx-audio-worker',
      label: 'macOS MLX Audio sidecar',
      family: 'local-backend',
      status: 'partial',
      platform: 'macos',
      detail: 'macOS-only MLX Python worker behind the stdio JSON sidecar protocol.',
    },
    capabilities: ['speech-to-text', 'text-correction', 'vision-correction'],
    runtime: 'mlx-python',
    protocol: 'stdio-json',
    commandCandidates: ['uv', 'python3'],
    readinessEnvKeys: ['WHISPREE_MLX_AUDIO_COMMAND'],
    defaultArgs: [],
  },
  {
    id: 'macos-whisperkit-coreml',
    provider: {
      id: 'macos-whisperkit-coreml',
      label: 'macOS WhisperKit/CoreML',
      family: 'local-backend',
      status: 'partial',
      platform: 'macos',
      detail: 'macOS CoreML/ANE local STT path isolated behind a native-module adapter seam.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisperkit-coreml',
    protocol: 'native-module',
    commandCandidates: [],
    readinessEnvKeys: ['WHISPREE_WHISPERKIT_HELPER'],
    defaultArgs: [],
  },
  {
    id: 'windows-whisper-cpp-directml',
    provider: {
      id: 'windows-whisper-cpp-directml',
      label: 'Windows whisper.cpp DirectML/CUDA sidecar',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows STT sidecar candidate that avoids MLX and uses whisper.cpp with DirectML/CUDA builds when available.',
    },
    capabilities: ['speech-to-text'],
    runtime: 'whisper-cpp',
    protocol: 'stdio-json',
    commandCandidates: ['whisper-cli.exe', 'whisper-cli', 'main.exe'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_WHISPER_CPP_COMMAND'],
    defaultArgs: ['--whispree-jsonl-sidecar'],
  },
  {
    id: 'windows-onnx-directml',
    provider: {
      id: 'windows-onnx-directml',
      label: 'Windows ONNX Runtime DirectML sidecar',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows GPU-backed local AI candidate for STT/correction through ONNX Runtime DirectML; intentionally not MLX.',
    },
    capabilities: ['speech-to-text', 'text-correction'],
    runtime: 'onnx-directml',
    protocol: 'stdio-json',
    commandCandidates: ['python.exe', 'python', 'onnxruntime_perf_test.exe'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_ONNX_COMMAND'],
    defaultArgs: ['-m', 'whispree_sidecar.onnx_directml'],
  },
  {
    id: 'windows-llama-cpp-vulkan',
    provider: {
      id: 'windows-llama-cpp-vulkan',
      label: 'Windows llama.cpp Vulkan/CUDA sidecar',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows local correction/VLM sidecar through llama.cpp Vulkan/CUDA builds; intentionally not MLX.',
    },
    capabilities: ['text-correction', 'vision-correction'],
    runtime: 'llama-cpp',
    protocol: 'stdio-json',
    commandCandidates: ['llama-cli.exe', 'llama-server.exe', 'llama-cli'],
    readinessEnvKeys: ['WHISPREE_WINDOWS_LLAMA_CPP_COMMAND'],
    defaultArgs: ['--whispree-jsonl-sidecar'],
  },
];

export function localEnginesForPlatform(platform: ProviderPlatform, capability?: LocalModelCapability): readonly LocalEngineDescriptor[] {
  return localEngineRegistry.filter((engine) => {
    const platformMatches = engine.provider.platform === platform || engine.provider.platform === 'cross-platform';
    const capabilityMatches = capability ? engine.capabilities.includes(capability) : true;
    return platformMatches && capabilityMatches;
  });
}

export function selectLocalEngine(input: LocalEngineSelectionInput): LocalEngineDescriptor | null {
  const engines = localEnginesForPlatform(input.platform, input.capability);
  if (engines.length === 0) return null;
  if (input.platform === 'windows') {
    if (input.capability === 'speech-to-text') return engines.find((engine) => engine.runtime === 'whisper-cpp') ?? engines[0]!;
    if (input.capability === 'vision-correction') return engines.find((engine) => engine.runtime === 'llama-cpp') ?? engines[0]!;
    return engines.find((engine) => engine.runtime === 'llama-cpp') ?? engines.find((engine) => engine.runtime === 'onnx-directml') ?? engines[0]!;
  }
  if (input.platform === 'macos') {
    if (input.preferredProviderType === 'mlx-audio' || input.preferredProviderType === 'local') {
      return engines.find((engine) => engine.runtime === 'mlx-python') ?? engines[0]!;
    }
    if (input.preferredProviderType === 'whisperkit') {
      return engines.find((engine) => engine.runtime === 'whisperkit-coreml') ?? engines[0]!;
    }
  }
  return engines[0]!;
}

export function buildSidecarProcessSpec(
  engine: LocalEngineDescriptor,
  env: NodeJS.ProcessEnv = process.env,
): SidecarProcessSpec | null {
  if (engine.protocol !== 'stdio-json') return null;
  const override = firstConfiguredEnv(engine, env);
  const command = override?.value || engine.commandCandidates[0];
  if (!command) return null;
  return {
    command,
    args: parseArgs(env[`${override?.key ?? engine.readinessEnvKeys[0] ?? 'WHISPREE_LOCAL'}_ARGS`]) ?? [...engine.defaultArgs],
    env: {
      WHISPREE_LOCAL_ENGINE_ID: engine.id,
      WHISPREE_LOCAL_ENGINE_RUNTIME: engine.runtime,
    },
  };
}

export function probeLocalEngineReadiness(
  engine: LocalEngineDescriptor,
  env: NodeJS.ProcessEnv = process.env,
  commandAvailable: (command: string) => boolean = () => false,
): LocalEngineReadiness {
  if (engine.protocol !== 'stdio-json') {
    return {
      engine,
      status: 'unsupported-protocol',
      command: null,
      source: 'none',
      envKey: null,
      message: `${engine.provider.label} uses ${engine.protocol}; this Electron shell currently executes stdio JSON sidecars only.`,
    };
  }
  const override = firstConfiguredEnv(engine, env);
  if (override) {
    return {
      engine,
      status: commandAvailable(override.value) ? 'configured' : 'missing-command',
      command: override.value,
      source: 'env',
      envKey: override.key,
      message: `${override.key}=${override.value}`,
    };
  }
  const candidate = engine.commandCandidates.find(commandAvailable) ?? engine.commandCandidates[0] ?? null;
  return {
    engine,
    status: candidate && commandAvailable(candidate) ? 'candidate' : 'missing-command',
    command: candidate,
    source: candidate ? 'candidate' : 'none',
    envKey: null,
    message: candidate ? `candidate command: ${candidate}` : 'No command candidate is configured.',
  };
}

export function assertWindowsEnginesAvoidMlx(): boolean {
  return localEnginesForPlatform('windows').every((engine) => engine.runtime !== 'mlx-python' && !engine.id.toLowerCase().includes('mlx'));
}

function firstConfiguredEnv(engine: LocalEngineDescriptor, env: NodeJS.ProcessEnv): { readonly key: string; readonly value: string } | null {
  for (const key of engine.readinessEnvKeys) {
    const value = env[key];
    if (value && value.trim().length > 0) return { key, value };
  }
  return null;
}

function parseArgs(value: string | undefined): readonly string[] | null {
  if (!value || !value.trim()) return null;
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.trim().length; index += 1) {
    const char = value.trim()[index]!;
    if (char === '\\') {
      const next = value.trim()[index + 1];
      if (next && (next === quote || next === '\\' || /\s/u.test(next))) {
        current += next;
        index += 1;
      } else {
        current += char;
      }
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/u.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current) args.push(current);
  return args;
}
