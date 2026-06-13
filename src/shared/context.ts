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
