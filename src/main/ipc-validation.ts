import { isPermissionKind, type AppSnapshot, type CommandAction, type CommandResult, type PermissionKind } from '../shared/ipc';

export function commandOk(action: CommandAction, snapshot: AppSnapshot, message = 'ok'): CommandResult {
  return { ok: true, action, snapshot, message };
}

export function commandError(
  action: CommandAction,
  snapshot: AppSnapshot,
  message: string,
  code: 'invalid-input' | 'unsupported' | 'not-implemented' = 'invalid-input',
): CommandResult {
  return {
    ok: false,
    action,
    snapshot,
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
