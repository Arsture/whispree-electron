export type SidecarCapability = 'speech-to-text' | 'text-correction' | 'vision-correction';

export interface SidecarEnvelopeBase {
  readonly id: string;
  readonly protocolVersion: 1;
}

export type SidecarRequest =
  | (SidecarEnvelopeBase & { readonly type: 'health' })
  | (SidecarEnvelopeBase & { readonly type: 'transcribe'; readonly audioRef: string; readonly language: string; readonly glossary: readonly string[] })
  | (SidecarEnvelopeBase & { readonly type: 'correct'; readonly text: string; readonly mode: string; readonly glossary: readonly string[] })
  | (SidecarEnvelopeBase & { readonly type: 'vision-correct'; readonly text: string; readonly imageRefs: readonly string[]; readonly mode: string })
  | (SidecarEnvelopeBase & { readonly type: 'cancel'; readonly targetId: string });

export type SidecarResponse =
  | (SidecarEnvelopeBase & { readonly type: 'health'; readonly ok: true; readonly capabilities: readonly SidecarCapability[] })
  | (SidecarEnvelopeBase & { readonly type: 'progress'; readonly targetId: string; readonly message: string; readonly percent: number | null })
  | (SidecarEnvelopeBase & { readonly type: 'transcription'; readonly text: string })
  | (SidecarEnvelopeBase & { readonly type: 'correction'; readonly originalText: string; readonly correctedText: string })
  | (SidecarEnvelopeBase & { readonly type: 'canceled'; readonly targetId: string })
  | (SidecarEnvelopeBase & { readonly type: 'error'; readonly targetId?: string; readonly message: string; readonly code: string });

export function isSidecarRequest(value: unknown): value is SidecarRequest {
  if (!isEnvelope(value)) return false;
  switch (value.type) {
    case 'health':
      return true;
    case 'transcribe':
      return typeof value.audioRef === 'string' && typeof value.language === 'string' && isStringArray(value.glossary);
    case 'correct':
      return typeof value.text === 'string' && typeof value.mode === 'string' && isStringArray(value.glossary);
    case 'vision-correct':
      return typeof value.text === 'string' && typeof value.mode === 'string' && isStringArray(value.imageRefs);
    case 'cancel':
      return typeof value.targetId === 'string';
    default:
      return false;
  }
}

export function isSidecarResponse(value: unknown): value is SidecarResponse {
  if (!isEnvelope(value)) return false;
  switch (value.type) {
    case 'health':
      return value.ok === true && isStringArray(value.capabilities);
    case 'progress':
      return typeof value.targetId === 'string' && typeof value.message === 'string' && (typeof value.percent === 'number' || value.percent === null);
    case 'transcription':
      return typeof value.text === 'string';
    case 'correction':
      return typeof value.originalText === 'string' && typeof value.correctedText === 'string';
    case 'canceled':
      return typeof value.targetId === 'string';
    case 'error':
      return typeof value.message === 'string' && typeof value.code === 'string';
    default:
      return false;
  }
}

function isEnvelope(value: unknown): value is Record<string, unknown> & SidecarEnvelopeBase & { readonly type: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as Record<string, unknown>).id === 'string' && (value as Record<string, unknown>).protocolVersion === 1 && typeof (value as Record<string, unknown>).type === 'string';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
