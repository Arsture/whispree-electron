import { describe, expect, it } from 'vitest';
import {
  browserContextFromAdapterPayload,
  cloneExternalContextSnapshot,
  createQuickFixRequest,
  createTargetContextSnapshot,
  targetContextToLegacyId,
  terminalContextFromAdapterPayload,
  type ExternalContextSnapshot,
} from './context';

describe('context and Quick Fix models', () => {
  it('creates Quick Fix requests without renderer clipboard access', () => {
    expect(createQuickFixRequest({ id: 'qf-1', selectedText: 'recieve', targetWordSetId: 'it', register: true })).toMatchObject({
      id: 'qf-1',
      selectedText: 'recieve',
      mode: 'correct-selection-and-register',
      targetWordSetId: 'it',
    });
  });

  it('clones external context snapshots so in-flight jobs stay immutable', () => {
    const snapshot: ExternalContextSnapshot = {
      browser: { id: 'browser-1', app: 'chrome', url: 'https://example.com', focusedFieldHint: 'textarea' },
      terminal: { id: 'terminal-1', app: 'iterm2', paneHint: 'pane-1', tmuxWindow: '1' },
      screenshots: [{ id: 'shot-1', createdAtIso: new Date(0).toISOString(), source: 'mock' }],
    };
    const cloned = cloneExternalContextSnapshot(snapshot);

    expect(cloned).toEqual(snapshot);
    expect(cloned).not.toBe(snapshot);
    expect(cloned.screenshots).not.toBe(snapshot.screenshots);
  });

  it('normalizes adapter payloads into typed target context snapshots with legacy ids derived at the edge', () => {
    const targetContext = createTargetContextSnapshot({
      browser: browserContextFromAdapterPayload('https://example.com\nExample'),
      terminal: terminalContextFromAdapterPayload('tmux:whispree'),
      warnings: ['screen-context-stop-failed'],
    });

    expect(targetContext.kind).toBe('external');
    expect(targetContext.browser?.url).toBe('https://example.com');
    expect(targetContext.terminal?.tmuxWindow).toBe('tmux:whispree');
    expect(targetContextToLegacyId(targetContext)).toContain('screen-context-stop-failed');
  });
});
