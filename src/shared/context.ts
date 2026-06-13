export interface CapturedScreenshotRef {
  readonly id: string;
  readonly createdAtIso: string;
  readonly source: 'mock' | 'screen-capture-adapter';
  readonly thumbnailDataUrl?: string;
}

export interface BrowserContextSnapshot {
  readonly id: string;
  readonly app: 'chrome' | 'edge' | 'unknown';
  readonly url: string | null;
  readonly focusedFieldHint: string | null;
}

export interface TerminalContextSnapshot {
  readonly id: string;
  readonly app: 'iterm2' | 'terminal' | 'windows-terminal' | 'unknown';
  readonly paneHint: string | null;
  readonly tmuxWindow: string | null;
}

export interface ExternalContextSnapshot {
  readonly browser: BrowserContextSnapshot | null;
  readonly terminal: TerminalContextSnapshot | null;
  readonly screenshots: readonly CapturedScreenshotRef[];
}

export type TargetContextSnapshot =
  | {
      readonly kind: 'none';
      readonly browser: null;
      readonly terminal: null;
      readonly screenshots: readonly CapturedScreenshotRef[];
      readonly warnings: readonly string[];
      readonly fallbackTargetContextId: string | null;
    }
  | {
      readonly kind: 'external';
      readonly browser: BrowserContextSnapshot | null;
      readonly terminal: TerminalContextSnapshot | null;
      readonly screenshots: readonly CapturedScreenshotRef[];
      readonly warnings: readonly string[];
      readonly fallbackTargetContextId: string | null;
    };

export const emptyTargetContextSnapshot: TargetContextSnapshot = {
  kind: 'none',
  browser: null,
  terminal: null,
  screenshots: [],
  warnings: [],
  fallbackTargetContextId: null,
};

export interface QuickFixRequest {
  readonly id: string;
  readonly selectedText: string;
  readonly createdAtIso: string;
  readonly mode: 'correct-selection-and-register' | 'correct-selection-only';
  readonly targetWordSetId: string | null;
}

export function createQuickFixRequest(input: {
  readonly id: string;
  readonly selectedText: string;
  readonly createdAtIso?: string;
  readonly targetWordSetId?: string | null;
  readonly register?: boolean;
}): QuickFixRequest {
  return {
    id: input.id,
    selectedText: input.selectedText,
    createdAtIso: input.createdAtIso ?? new Date(0).toISOString(),
    mode: input.register === false ? 'correct-selection-only' : 'correct-selection-and-register',
    targetWordSetId: input.targetWordSetId ?? null,
  };
}

export function cloneExternalContextSnapshot(snapshot: ExternalContextSnapshot): ExternalContextSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ExternalContextSnapshot;
}

export function cloneTargetContextSnapshot(snapshot: TargetContextSnapshot): TargetContextSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as TargetContextSnapshot;
}

export function createTargetContextSnapshot(input: {
  readonly browser?: BrowserContextSnapshot | null;
  readonly terminal?: TerminalContextSnapshot | null;
  readonly screenshots?: readonly CapturedScreenshotRef[];
  readonly warnings?: readonly string[];
  readonly fallbackTargetContextId?: string | null;
}): TargetContextSnapshot {
  const browser = input.browser ?? null;
  const terminal = input.terminal ?? null;
  const screenshots = [...(input.screenshots ?? [])];
  const warnings = [...(input.warnings ?? [])];
  const fallbackTargetContextId = input.fallbackTargetContextId ?? null;
  const hasContext = Boolean(browser || terminal || screenshots.length > 0 || warnings.length > 0 || fallbackTargetContextId);
  if (!hasContext) return emptyTargetContextSnapshot;
  return {
    kind: 'external',
    browser,
    terminal,
    screenshots,
    warnings,
    fallbackTargetContextId,
  };
}

export function browserContextFromAdapterPayload(payload: string): BrowserContextSnapshot {
  const [urlLine = payload, titleLine = ''] = payload.split('\n');
  return {
    id: payload,
    app: 'chrome',
    url: /^https?:\/\//u.test(urlLine) ? urlLine : null,
    focusedFieldHint: titleLine || null,
  };
}

export function terminalContextFromAdapterPayload(payload: string): TerminalContextSnapshot {
  return {
    id: payload,
    app: payload.toLowerCase().includes('windows') ? 'windows-terminal' : 'iterm2',
    paneHint: payload || null,
    tmuxWindow: payload.toLowerCase().includes('tmux') ? payload : null,
  };
}

export function targetContextFromLegacyId(targetContextId: string | null): TargetContextSnapshot {
  return createTargetContextSnapshot({ fallbackTargetContextId: targetContextId });
}

export function targetContextToLegacyId(snapshot: TargetContextSnapshot): string | null {
  if (snapshot.kind === 'none') return snapshot.fallbackTargetContextId;
  const context: Record<string, string | readonly string[]> = {};
  if (snapshot.browser) context.browser = snapshot.browser.id;
  if (snapshot.terminal) context.terminal = snapshot.terminal.id;
  if (snapshot.warnings.length > 0) context.warnings = snapshot.warnings;
  if (Object.keys(context).length > 0) return JSON.stringify(context);
  return snapshot.fallbackTargetContextId;
}
