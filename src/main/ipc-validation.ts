import {
  isPermissionKind,
  type AppSnapshot,
  type CommandAction,
  type CommandError,
  type CommandResult,
  type PermissionKind,
  type RealRecordingStartInput,
  type RecordedAudioInput,
  type SettingsCommandAction,
  type SettingsCommandResult,
} from '../shared/ipc';
import type { AppSettingsSnapshot } from '../shared/settings';

export function commandOk(action: CommandAction, snapshot: AppSnapshot, message = 'ok'): CommandResult {
  return { ok: true, action, snapshot, message };
}

export function commandError(
  action: CommandAction,
  snapshot: AppSnapshot,
  message: string,
  code: CommandError['code'] = 'invalid-input',
): CommandResult {
  return {
    ok: false,
    action,
    snapshot,
    error: { code, message },
  };
}

export function settingsCommandOk(action: SettingsCommandAction, settings: AppSettingsSnapshot, message = 'ok'): SettingsCommandResult {
  return { ok: true, action, settings, message };
}

export function settingsCommandError(
  action: SettingsCommandAction,
  settings: AppSettingsSnapshot,
  message: string,
  code: CommandError['code'] = 'invalid-input',
): SettingsCommandResult {
  return {
    ok: false,
    action,
    settings,
    error: { code, message },
  };
}

export function rejectUnexpectedArgs(
  action: CommandAction,
  snapshot: AppSnapshot,
  args: readonly unknown[],
): CommandResult | null {
  if (args.length === 0) return null;
  return commandError(action, snapshot, `${action} does not accept positional arguments.`);
}

export function rejectUnexpectedSettingsArgs(
  action: SettingsCommandAction,
  settings: AppSettingsSnapshot,
  args: readonly unknown[],
): SettingsCommandResult | null {
  if (args.length === 0) return null;
  return settingsCommandError(action, settings, `${action} does not accept extra positional arguments.`);
}

export function validatePermissionKindInput(
  snapshot: AppSnapshot,
  value: unknown,
): { readonly ok: true; readonly kind: PermissionKind } | { readonly ok: false; readonly result: CommandResult } {
  if (isPermissionKind(value)) return { ok: true, kind: value };
  return {
    ok: false,
    result: commandError('request-permission', snapshot, `Invalid permission kind: ${String(value)}`),
  };
}

export function validateRealRecordingStartInput(
  snapshot: AppSnapshot,
  value: unknown,
): { readonly ok: true; readonly input: RealRecordingStartInput } | { readonly ok: false; readonly result: CommandResult } {
  if (!isRecord(value)) return { ok: false, result: commandError('start-real-recording', snapshot, 'Recording start input must be an object.') };
  const mimeType = value.mimeType;
  if (mimeType !== null && typeof mimeType !== 'string') {
    return { ok: false, result: commandError('start-real-recording', snapshot, 'mimeType must be a string or null.') };
  }
  return { ok: true, input: { mimeType } };
}

export function validateRecordedAudioInput(
  snapshot: AppSnapshot,
  value: unknown,
): { readonly ok: true; readonly input: RecordedAudioInput } | { readonly ok: false; readonly result: CommandResult } {
  if (!isRecord(value)) return { ok: false, result: commandError('submit-recorded-audio', snapshot, 'Recorded audio input must be an object.') };
  if (!(value.bytes instanceof ArrayBuffer)) {
    return { ok: false, result: commandError('submit-recorded-audio', snapshot, 'Recorded audio bytes must be an ArrayBuffer.') };
  }
  if (typeof value.mimeType !== 'string' || value.mimeType.trim().length === 0) {
    return { ok: false, result: commandError('submit-recorded-audio', snapshot, 'Recorded audio mimeType must be a non-empty string.') };
  }
  if (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs) || value.durationMs < 0) {
    return { ok: false, result: commandError('submit-recorded-audio', snapshot, 'Recorded audio durationMs must be a non-negative finite number.') };
  }
  return {
    ok: true,
    input: {
      bytes: value.bytes,
      mimeType: value.mimeType,
      durationMs: value.durationMs,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
