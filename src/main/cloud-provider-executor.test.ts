import { describe, expect, it, vi } from 'vitest';
import { defaultAppSettings } from '../shared/settings';
import { GroqCorrectionProvider, GroqTranscriptionProvider, NoopCorrectionProvider, OpenAIResponsesCorrectionProvider, type FetchLike } from './cloud-provider-executor';

const credentialBoundary = (secrets: Record<string, string | null>) => ({
  getSecret: async (kind: 'groq' | 'openai') => secrets[kind] ?? null,
});

describe('cloud provider executor', () => {
  it('fails before network when a credential is missing', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const provider = new GroqCorrectionProvider(credentialBoundary({ groq: null }), () => defaultAppSettings, fetchImpl);

    await expect(provider.correct({ jobId: '1', sequence: 1, text: 'hello', mode: 'standard', glossary: [], screenshotRefs: [], systemPrompt: 'Swift prompt' })).rejects.toThrow('credential is missing');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('executes Groq correction through fetch and parses message content', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ choices: [{ message: { content: 'corrected text' } }] }),
    }));
    const provider = new GroqCorrectionProvider(credentialBoundary({ groq: 'gsk_test' }), () => defaultAppSettings, fetchImpl);

    const result = await provider.correct({ jobId: '1', sequence: 1, text: 'helo', mode: 'standard', glossary: [], screenshotRefs: [], systemPrompt: 'Swift prompt' });

    expect(result.correctedText).toBe('corrected text');
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/chat/completions'), expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1].body))).toMatchObject({ model: defaultAppSettings.groqLLMModel });
  });

  it('executes OpenAI Responses correction with an API key boundary', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ output_text: 'openai corrected' }),
    }));
    const provider = new OpenAIResponsesCorrectionProvider(credentialBoundary({ openai: 'sk_test' }), () => defaultAppSettings, fetchImpl);

    await expect(provider.correct({ jobId: '1', sequence: 1, text: 'helo', mode: 'standard', glossary: [], screenshotRefs: [], systemPrompt: 'Swift prompt' })).resolves.toMatchObject({ correctedText: 'openai corrected' });
  });

  it('sends captured audio to Groq transcription as multipart form data', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ text: 'transcribed audio' }),
    }));
    const provider = new GroqTranscriptionProvider(credentialBoundary({ groq: 'gsk_test' }), () => defaultAppSettings, fetchImpl);

    const result = await provider.transcribe({
      jobId: '1',
      sequence: 1,
      language: 'ko',
      glossary: ['Whispree'],
      audioRef: { kind: 'memory', value: `data:audio/webm;base64,${Buffer.from('audio').toString('base64')}` },
    });

    expect(result.text).toBe('transcribed audio');
    expect(fetchImpl.mock.calls[0]?.[1].body).toBeInstanceOf(FormData);
  });

  it('returns the raw transcript when correction is disabled', async () => {
    const provider = new NoopCorrectionProvider();

    await expect(provider.correct({ jobId: '1', sequence: 1, text: 'raw', mode: 'standard', glossary: [], screenshotRefs: [], systemPrompt: 'Swift prompt' })).resolves.toMatchObject({ correctedText: 'raw' });
  });
});
