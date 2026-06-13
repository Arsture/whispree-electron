import { describe, expect, it } from 'vitest';
import { initialAppSnapshot } from '../shared/ipc';
import { rejectUnexpectedArgs, validatePermissionKindInput, validateRealRecordingStartInput, validateRecordedAudioInput } from './ipc-validation';

describe('IPC runtime validation', () => {
  it('accepts only known permission kinds', () => {
    expect(validatePermissionKindInput(initialAppSnapshot, 'microphone')).toEqual({ ok: true, kind: 'microphone' });
    expect(validatePermissionKindInput(initialAppSnapshot, 'filesystem')).toMatchObject({
      ok: false,
      result: {
        ok: false,
        action: 'request-permission',
        error: { code: 'invalid-input' },
      },
    });
  });

  it('rejects unexpected command arguments with typed errors', () => {
    expect(rejectUnexpectedArgs('cancel-foreground-job', initialAppSnapshot, ['job-1'])).toMatchObject({
      ok: false,
      action: 'cancel-foreground-job',
      error: { code: 'invalid-input' },
    });
  });

  it('validates real recording start and recorded audio payloads', () => {
    expect(validateRealRecordingStartInput(initialAppSnapshot, { mimeType: 'audio/webm' })).toEqual({
      ok: true,
      input: { mimeType: 'audio/webm' },
    });
    expect(validateRecordedAudioInput(initialAppSnapshot, {
      bytes: new ArrayBuffer(2),
      mimeType: 'audio/webm',
      durationMs: 12,
    })).toMatchObject({ ok: true });
    expect(validateRecordedAudioInput(initialAppSnapshot, {
      bytes: 'nope',
      mimeType: 'audio/webm',
      durationMs: 12,
    })).toMatchObject({ ok: false });
  });
});
