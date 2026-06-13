import { describe, expect, it } from 'vitest';
import { backendReadinessSummary, localBackendsForPlatform } from './local-backends';

describe('local backend selection', () => {
  it('selects macOS MLX/WhisperKit descriptors for macOS capabilities', () => {
    const macosStt = localBackendsForPlatform('macos', 'speech-to-text').map((backend) => backend.descriptor.id);
    expect(macosStt).toContain('macos-mlx-sidecar');
    expect(macosStt).toContain('macos-whisperkit');
  });

  it('keeps Windows candidates concrete and non-MLX', () => {
    const windows = localBackendsForPlatform('windows');
    expect(windows.map((backend) => backend.descriptor.id)).toEqual([
      'windows-whisper-cpp-directml',
      'windows-onnx-directml',
      'windows-llama-cpp-vulkan',
    ]);
    expect(windows.map((backend) => backend.runtime)).not.toContain('mlx-python');
    expect(backendReadinessSummary('windows')).toMatchObject({ total: 3, planned: 0, notTested: 0 });
  });
});
