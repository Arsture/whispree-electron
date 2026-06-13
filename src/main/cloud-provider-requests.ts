import type { CorrectionInput, TranscriptionInput } from '../shared/providers';
import type { AppSettingsSnapshot } from '../shared/settings';

export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
export const GROQ_OPENAI_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT = `${GROQ_OPENAI_BASE_URL}/audio/transcriptions`;
export const GROQ_CHAT_COMPLETIONS_ENDPOINT = `${GROQ_OPENAI_BASE_URL}/chat/completions`;

export type CloudProviderKind = 'groq' | 'openai';

export interface CloudCredentialBoundary {
  getSecret(kind: CloudProviderKind): Promise<string | null>;
}

export interface HttpRequestSpec {
  readonly method: 'POST';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export type CredentialResolution =
  | {
      readonly ok: true;
      readonly apiKey: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'missing-credential';
      readonly provider: CloudProviderKind;
    };

export async function resolveCredential(boundary: CloudCredentialBoundary, provider: CloudProviderKind): Promise<CredentialResolution> {
  const apiKey = await boundary.getSecret(provider);
  return apiKey ? { ok: true, apiKey } : { ok: false, reason: 'missing-credential', provider };
}

export function buildOpenAIResponseRequest(apiKey: string, settings: AppSettingsSnapshot, input: CorrectionInput): HttpRequestSpec {
  return {
    method: 'POST',
    url: OPENAI_RESPONSES_ENDPOINT,
    headers: authHeaders(apiKey),
    body: {
      model: settings.openaiModel,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: 'Correct speech-to-text errors while preserving user intent and factual content.' }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: input.text }],
        },
      ],
      metadata: {
        jobId: input.jobId,
        correctionMode: input.mode,
      },
    },
  };
}

export function buildGroqChatCompletionRequest(apiKey: string, settings: AppSettingsSnapshot, input: CorrectionInput): HttpRequestSpec {
  return {
    method: 'POST',
    url: GROQ_CHAT_COMPLETIONS_ENDPOINT,
    headers: authHeaders(apiKey),
    body: {
      model: settings.groqLLMModel,
      messages: [
        { role: 'system', content: 'Correct speech-to-text errors while preserving user intent and factual content.' },
        { role: 'user', content: input.text },
      ],
      temperature: 0,
    },
  };
}

export function buildGroqTranscriptionRequest(apiKey: string, settings: AppSettingsSnapshot, input: TranscriptionInput): HttpRequestSpec {
  return {
    method: 'POST',
    url: GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT,
    headers: authHeaders(apiKey),
    body: {
      model: 'whisper-large-v3-turbo',
      file: input.audioRef.kind === 'file' ? input.audioRef.value : undefined,
      url: input.audioRef.kind === 'memory' ? input.audioRef.value : undefined,
      language: settings.language === 'auto' ? undefined : settings.language,
      prompt: input.glossary.length > 0 ? `Domain words: ${input.glossary.join(', ')}` : undefined,
      response_format: 'json',
    },
  };
}

export function redactRequestSpec(spec: HttpRequestSpec): HttpRequestSpec {
  return {
    ...spec,
    headers: {
      ...spec.headers,
      Authorization: 'Bearer [redacted]',
    },
  };
}

function authHeaders(apiKey: string): Readonly<Record<string, string>> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}
