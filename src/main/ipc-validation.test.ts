import { describe, expect, it } from 'vitest';
import { initialAppSnapshot } from '../shared/ipc';
import { rejectUnexpectedArgs, validatePermissionKindInput } from './ipc-validation';

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
});
