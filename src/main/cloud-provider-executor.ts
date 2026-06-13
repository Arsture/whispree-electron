import type { CorrectionInput, CorrectionResult, LLMProvider, ProviderDescriptor, STTProvider, TranscriptionInput, TranscriptionResult } from '../shared/providers';
import type { AppSettingsSnapshot } from '../shared/settings';
import {
  GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT,
  buildGroqChatCompletionRequest,
  buildOpenAIResponseRequest,
  resolveCredential,
  type CloudCredentialBoundary,
  type CloudProviderKind,
  type HttpRequestSpec,
} from './cloud-provider-requests';

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init: { readonly method: 'POST'; readonly headers: Record<string, string>; readonly body: BodyInit | string }) => Promise<FetchResponseLike>;
export type SettingsSnapshotProvider = () => AppSettingsSnapshot;

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as Promise<FetchResponseLike>;

export class GroqTranscriptionProvider implements STTProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'groq-stt-runtime',
    label: 'Groq Cloud STT',
    family: 'stt',
    status: 'partial',
    platform: 'cross-platform',
    detail: 'Performs real Groq transcription when an in-memory Groq API key and captured audio are available.',
  };

  constructor(
    private readonly credentials: CloudCredentialBoundary,
    private readonly settings: SettingsSnapshotProvider,
    private readonly fetchImpl: FetchLike = defaultFetch,
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const credential = await resolveCredential(this.credentials, 'groq');
    if (!credential.ok) throw missingCredentialError(credential.provider);
    const form = new FormData();
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    const settings = this.settings();
    if (settings.language !== 'auto') form.append('language', settings.language);
    if (input.glossary.length > 0) form.append('prompt', `Domain words: ${input.glossary.join(', ')}`);
    form.append('file', audioRefToBlob(input.audioRef.value), 'whispree-recording.webm');

    const response = await this.fetchImpl(GROQ_AUDIO_TRANSCRIPTIONS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credential.apiKey}` },
      body: form,
    });
    const json = await parseJsonResponse(response, 'Groq transcription failed');
    const text = readStringPath(json, ['text']);
    if (!text) throw new Error('Groq transcription response did not include text.');
    return {
      text,
      metadata: {
        providerId: this.descriptor.id,
        status: this.descriptor.status,
      },
    };
  }
}

export class GroqCorrectionProvider implements LLMProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'groq-llm-runtime',
    label: 'Groq Cloud Correction',
    family: 'llm',
    status: 'partial',
    platform: 'cross-platform',
    detail: 'Performs real Groq OpenAI-compatible chat correction when a Groq API key is available.',
  };

  constructor(
    private readonly credentials: CloudCredentialBoundary,
    private readonly settings: SettingsSnapshotProvider,
    private readonly fetchImpl: FetchLike = defaultFetch,
  ) {}

  async correct(input: CorrectionInput): Promise<CorrectionResult> {
    const credential = await resolveCredential(this.credentials, 'groq');
    if (!credential.ok) throw missingCredentialError(credential.provider);
    const request = buildGroqChatCompletionRequest(credential.apiKey, this.settings(), input);
    const json = await executeJsonRequest(this.fetchImpl, request, 'Groq correction failed');
    const correctedText = readStringPath(json, ['choices', 0, 'message', 'content']);
    if (!correctedText) throw new Error('Groq correction response did not include message content.');
    return correctionResult(input, correctedText, this.descriptor);
  }
}

export class OpenAIResponsesCorrectionProvider implements LLMProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'openai-responses-runtime',
    label: 'OpenAI Responses Correction',
    family: 'llm',
    status: 'partial',
    platform: 'cross-platform',
    detail: 'Performs real OpenAI Responses API correction when an OpenAI API key is available.',
  };

  constructor(
    private readonly credentials: CloudCredentialBoundary,
    private readonly settings: SettingsSnapshotProvider,
    private readonly fetchImpl: FetchLike = defaultFetch,
  ) {}

  async correct(input: CorrectionInput): Promise<CorrectionResult> {
    const credential = await resolveCredential(this.credentials, 'openai');
    if (!credential.ok) throw missingCredentialError(credential.provider);
    const request = buildOpenAIResponseRequest(credential.apiKey, this.settings(), input);
    const json = await executeJsonRequest(this.fetchImpl, request, 'OpenAI correction failed');
    const correctedText = readStringPath(json, ['output_text']) ?? readStringPath(json, ['output', 0, 'content', 0, 'text']);
    if (!correctedText) throw new Error('OpenAI response did not include output text.');
    return correctionResult(input, correctedText, this.descriptor);
  }
}

export class NoopCorrectionProvider implements LLMProvider {
  readonly descriptor: ProviderDescriptor = {
    id: 'noop-correction',
    label: 'No correction',
    family: 'llm',
    status: 'implemented',
    platform: 'cross-platform',
    detail: 'Returns raw transcript when correction is disabled or provider is none.',
  };

  async correct(input: CorrectionInput): Promise<CorrectionResult> {
    return correctionResult(input, input.text, this.descriptor);
  }
}

async function executeJsonRequest(fetchImpl: FetchLike, request: HttpRequestSpec, failurePrefix: string): Promise<unknown> {
  const response = await fetchImpl(request.url, {
    method: request.method,
    headers: { ...request.headers },
    body: JSON.stringify(request.body),
  });
  return parseJsonResponse(response, failurePrefix);
}

async function parseJsonResponse(response: FetchResponseLike, failurePrefix: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${failurePrefix}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
}

function correctionResult(input: CorrectionInput, correctedText: string, descriptor: ProviderDescriptor): CorrectionResult {
  return {
    originalText: input.text,
    correctedText,
    metadata: {
      providerId: descriptor.id,
      status: descriptor.status,
      preservesOriginal: true,
    },
  };
}

function missingCredentialError(provider: CloudProviderKind): Error {
  return new Error(`${provider} credential is missing; configure it before using the real provider path.`);
}

function audioRefToBlob(value: string): Blob {
  if (!value.startsWith('data:')) return new Blob([value], { type: 'text/plain' });
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/u.exec(value);
  if (!match) throw new Error('Unsupported in-memory audio reference.');
  const mimeType = match[1] || 'application/octet-stream';
  const payload = match[2] ?? '';
  const bytes = Uint8Array.from(Buffer.from(payload, 'base64'));
  return new Blob([bytes], { type: mimeType });
}

function readStringPath(value: unknown, path: readonly (string | number)[]): string | null {
  let cursor = value;
  for (const key of path) {
    if (typeof key === 'number') {
      if (!Array.isArray(cursor)) return null;
      cursor = cursor[key];
    } else {
      if (typeof cursor !== 'object' || cursor === null || !(key in cursor)) return null;
      cursor = (cursor as Record<string, unknown>)[key];
    }
  }
  return typeof cursor === 'string' && cursor.trim().length > 0 ? cursor : null;
}
