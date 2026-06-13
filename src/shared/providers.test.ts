import { describe, expect, it } from 'vitest';
import { permissionStateOrder } from './adapters';
import { localModelBackendRegistry, MockLLMProvider, MockSTTProvider } from './providers';

describe('provider and adapter contracts', () => {
  it('mock STT returns deterministic text and metadata', async () => {
    const provider = new MockSTTProvider();
    const result = await provider.transcribe({
      jobId: 'job-1',
      sequence: 7,
      language: 'ko',
      glossary: ['Codex'],
      audioRef: { kind: 'mock', value: 'sample' },
    });

    expect(result).toEqual({
      text: 'Mock transcript #7 using Codex',
      metadata: {
        providerId: 'mock-stt',
        status: 'mock',
      },
    });
  });

  it('mock LLM returns deterministic correction while preserving original text', async () => {
    const provider = new MockLLMProvider();
    const result = await provider.correct({
      jobId: 'job-1',
      sequence: 1,
      text: 'hello whispree',
      mode: 'standard',
      glossary: [],
      screenshotRefs: [],
    });

    expect(result.originalText).toBe('hello whispree');
    expect(result.correctedText).toBe('[corrected:standard] hello whispree');
    expect(result.metadata.preservesOriginal).toBe(true);
  });

  it('permission statuses cover granted, denied, prompt-required, unsupported, manual-required, not-tested, and mock', () => {
    expect(permissionStateOrder).toEqual([
      'granted',
      'denied',
      'prompt-required',
      'unsupported',
      'manual-required',
      'not-tested',
      'mock',
    ]);
  });

  it('local backend registry represents macOS MLX and concrete Windows non-MLX strategies', () => {
    const macosMlx = localModelBackendRegistry.find((backend) => backend.descriptor.id === 'macos-mlx-sidecar');
    const windowsBackends = localModelBackendRegistry.filter((backend) => backend.descriptor.platform === 'windows');

    expect(macosMlx).toMatchObject({
      runtime: 'mlx-python',
      protocol: 'stdio-json',
      descriptor: { platform: 'macos', status: 'partial' },
    });
    expect(windowsBackends.map((backend) => backend.runtime)).toEqual(['whisper-cpp', 'onnx-directml', 'llama-cpp']);
    expect(windowsBackends.every((backend) => backend.protocol === 'stdio-json')).toBe(true);
    expect(windowsBackends.every((backend) => backend.descriptor.status === 'partial')).toBe(true);
  });
});
