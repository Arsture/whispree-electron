import { describe, expect, it } from 'vitest';
import { defaultAppSettings } from '../shared/settings';
import {
  GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT,
  GROQ_CHAT_COMPLETIONS_ENDPOINT,
  OPENAI_RESPONSES_ENDPOINT,
  buildGroqChatCompletionRequest,
  buildGroqTranscriptionRequest,
  buildOpenAIResponseRequest,
  redactRequestSpec,
  resolveCredential,
  type CloudCredentialBoundary,
} from './cloud-provider-requests';

const credentialBoundary = (secret: string | null): CloudCredentialBoundary => ({
  getSecret: async () => secret,
});

describe('cloud provider request builders', () => {
  it('resolves missing credentials without attempting network calls', async () => {
    await expect(resolveCredential(credentialBoundary(null), 'groq')).resolves.toEqual({
      ok: false,
      provider: 'groq',
      reason: 'missing-credential',
    });
  });

  it('builds OpenAI Responses API correction requests', () => {
    const request = buildOpenAIResponseRequest('sk_test', defaultAppSettings, {
      jobId: 'job-1',
      sequence: 1,
      text: 'hello whispree',
      mode: 'standard',
      glossary: [],
      screenshotRefs: [],
      systemPrompt: 'Swift prompt',
    });

    expect(request.url).toBe(OPENAI_RESPONSES_ENDPOINT);
    expect(request.headers.Authorization).toBe('Bearer sk_test');
    expect(request.body).toMatchObject({ model: 'gpt-5.5', metadata: { jobId: 'job-1', correctionMode: 'standard' } });
    expect(JSON.stringify(request.body)).toContain('Swift prompt');
    expect(redactRequestSpec(request).headers.Authorization).toBe('Bearer [redacted]');
  });

  it('builds Groq OpenAI-compatible chat and transcription requests', () => {
    const correction = buildGroqChatCompletionRequest('gsk_test', defaultAppSettings, {
      jobId: 'job-1',
      sequence: 1,
      text: 'hello whispree',
      mode: 'standard',
      glossary: [],
      screenshotRefs: [],
      systemPrompt: 'Swift prompt',
    });
    const transcription = buildGroqTranscriptionRequest('gsk_test', defaultAppSettings, {
      jobId: 'job-1',
      sequence: 1,
      language: 'ko',
      glossary: ['Codex'],
      audioRef: { kind: 'file', value: '/tmp/audio.wav' },
    });

    expect(correction.url).toBe(GROQ_CHAT_COMPLETIONS_ENDPOINT);
    expect(correction.body).toMatchObject({ model: 'qwen/qwen3-32b', temperature: 0 });
    expect(JSON.stringify(correction.body)).toContain('Swift prompt');
    expect(transcription.url).toBe(GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT);
    expect(transcription.body).toMatchObject({ model: 'whisper-large-v3-turbo', file: '/tmp/audio.wav', language: 'ko' });
  });
});
