import { describe, expect, it } from 'vitest';
import { backendReadinessSummary, localBackendsForPlatform } from './local-backends';

describe('local backend selection', () => {
  it('selects macOS MLX/WhisperKit descriptors for macOS capabilities', () => {
    const macosStt = localBackendsForPlatform('macos', 'speech-to-text').map((backend) => backend.descriptor.id);
    expect(macosStt).toContain('macos-mlx-sidecar');
    expect(macosStt).toContain('macos-whisperkit');
  });

  it('keeps Windows candidates not-tested until executed', () => {
    const windows = localBackendsForPlatform('windows');
    expect(windows.map((backend) => backend.descriptor.id)).toEqual([
      'windows-onnx-directml-candidate',
      'windows-llama-cpp-candidate',
      'windows-local-placeholder',
    ]);
    expect(backendReadinessSummary('windows')).toMatchObject({ total: 3, notTested: 3 });
  });
});
