import {
  isPermissionKind,
  type AppSnapshot,
  type CommandAction,
  type CommandError,
  type CommandResult,
  type PermissionKind,
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
