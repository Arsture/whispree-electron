import { describe, expect, it } from 'vitest';
import { isSidecarRequest, isSidecarResponse } from './sidecar-protocol';

describe('sidecar protocol', () => {
  it('validates health, transcription, correction, vision, cancel, progress, and error envelopes', () => {
    expect(isSidecarRequest({ id: '1', protocolVersion: 1, type: 'health' })).toBe(true);
    expect(isSidecarRequest({ id: '2', protocolVersion: 1, type: 'transcribe', audioRef: 'file.wav', language: 'ko', glossary: [] })).toBe(true);
    expect(isSidecarRequest({ id: '3', protocolVersion: 1, type: 'correct', text: 'hello', mode: 'standard', glossary: [] })).toBe(true);
    expect(isSidecarRequest({ id: '4', protocolVersion: 1, type: 'vision-correct', text: 'hello', imageRefs: ['shot'], mode: 'standard' })).toBe(true);
    expect(isSidecarRequest({ id: '5', protocolVersion: 1, type: 'cancel', targetId: '2' })).toBe(true);
    expect(isSidecarResponse({ id: '6', protocolVersion: 1, type: 'progress', targetId: '2', message: 'loading', percent: null })).toBe(true);
    expect(isSidecarResponse({ id: '7', protocolVersion: 1, type: 'error', targetId: '2', message: 'failed', code: 'sidecar-error' })).toBe(true);
  });

  it('rejects malformed envelopes', () => {
    expect(isSidecarRequest({ id: 'bad', protocolVersion: 2, type: 'health' })).toBe(false);
    expect(isSidecarRequest({ id: 'bad', protocolVersion: 1, type: 'transcribe', audioRef: 1, language: 'ko', glossary: [] })).toBe(false);
    expect(isSidecarResponse({ id: 'bad', protocolVersion: 1, type: 'progress', targetId: 'x', message: 'x', percent: 'half' })).toBe(false);
  });
});
