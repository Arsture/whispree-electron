import { describe, expect, it } from 'vitest';
import manifest from '../../shared/local-engine-manifest.json';
import { assertWindowsEnginesAvoidMlx, buildSidecarProcessSpec, localEngineRegistry, localEnginesForPlatform, probeLocalEngineReadiness, selectLocalEngine } from './engine-registry';

describe('local AI engine registry', () => {
  it('loads local engines from the shared manifest and keeps Windows candidates off MLX runtimes', () => {
    expect(localEngineRegistry.map((engine) => engine.id)).toEqual(manifest.map((engine) => engine.id));
    const windowsEngines = localEnginesForPlatform('windows');

    expect(windowsEngines.length).toBeGreaterThan(1);
    expect(windowsEngines.map((engine) => engine.runtime)).toEqual(expect.arrayContaining(['whisper-cpp', 'onnx-directml', 'llama-cpp']));
    expect(windowsEngines.map((engine) => engine.runtime)).not.toContain('mlx-python');
    expect(assertWindowsEnginesAvoidMlx()).toBe(true);
  });

  it('selects Windows non-MLX engines by capability even when local settings came from macOS defaults', () => {
    expect(selectLocalEngine({ platform: 'windows', capability: 'speech-to-text', preferredProviderType: 'mlx-audio' })?.runtime).toBe('whisper-cpp');
    expect(selectLocalEngine({ platform: 'windows', capability: 'text-correction', preferredProviderType: 'local' })?.runtime).toBe('llama-cpp');
    expect(selectLocalEngine({ platform: 'windows', capability: 'vision-correction', preferredProviderType: 'local' })?.runtime).toBe('llama-cpp');
  });

  it('preserves macOS MLX and WhisperKit as separate adapter candidates', () => {
    const macStt = localEnginesForPlatform('macos', 'speech-to-text');

    expect(macStt.map((engine) => engine.runtime)).toEqual(expect.arrayContaining(['mlx-python', 'whisperkit-coreml']));
  });

  it('builds env-driven sidecar process specs and readiness probes', () => {
    const engine = selectLocalEngine({ platform: 'windows', capability: 'speech-to-text', preferredProviderType: 'local' })!;
    const spec = buildSidecarProcessSpec(engine, {
      WHISPREE_WINDOWS_WHISPER_CPP_COMMAND: 'C:/Whispree/whisper-cli.exe',
      WHISPREE_WINDOWS_WHISPER_CPP_COMMAND_ARGS: '--server --jsonl',
    } as NodeJS.ProcessEnv);

    expect(spec).toMatchObject({
      command: 'C:/Whispree/whisper-cli.exe',
      args: ['--server', '--jsonl'],
      env: { WHISPREE_LOCAL_ENGINE_RUNTIME: 'whisper-cpp' },
    });
    expect(probeLocalEngineReadiness(engine, { WHISPREE_WINDOWS_WHISPER_CPP_COMMAND: 'whisper-cli.exe' } as NodeJS.ProcessEnv, (command) => command === 'whisper-cli.exe')).toMatchObject({
      status: 'configured',
      source: 'env',
      envKey: 'WHISPREE_WINDOWS_WHISPER_CPP_COMMAND',
    });
  });

  it('parses quoted sidecar args without breaking Windows paths or prompt flags', () => {
    const engine = selectLocalEngine({ platform: 'windows', capability: 'text-correction', preferredProviderType: 'local' })!;
    const spec = buildSidecarProcessSpec(engine, {
      WHISPREE_WINDOWS_LLAMA_CPP_COMMAND: 'C:/Program Files/Whispree/llama-cli.exe',
      WHISPREE_WINDOWS_LLAMA_CPP_COMMAND_ARGS: '--model "C:\\Models\\qwen coder.gguf" --cache-dir C:\\Whispree\\Cache --system-prompt "fix dictation"',
    } as NodeJS.ProcessEnv);

    expect(spec).toMatchObject({
      command: 'C:/Program Files/Whispree/llama-cli.exe',
      args: ['--model', 'C:\\Models\\qwen coder.gguf', '--cache-dir', 'C:\\Whispree\\Cache', '--system-prompt', 'fix dictation'],
    });
  });
});
