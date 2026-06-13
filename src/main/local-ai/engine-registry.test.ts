import { describe, expect, it } from 'vitest';
import { assertWindowsEnginesAvoidMlx, localEnginesForPlatform } from './engine-registry';

describe('local AI engine registry', () => {
  it('keeps Windows local AI candidates off MLX runtimes', () => {
    const windowsEngines = localEnginesForPlatform('windows');

    expect(windowsEngines.length).toBeGreaterThan(1);
    expect(windowsEngines.map((engine) => engine.runtime)).toEqual(expect.arrayContaining(['whisper-cpp', 'onnx-directml', 'llama-cpp']));
    expect(assertWindowsEnginesAvoidMlx()).toBe(true);
  });

  it('preserves macOS MLX and WhisperKit as separate adapter candidates', () => {
    const macStt = localEnginesForPlatform('macos', 'speech-to-text');

    expect(macStt.map((engine) => engine.runtime)).toEqual(expect.arrayContaining(['mlx-python', 'whisperkit-coreml']));
  });
});
