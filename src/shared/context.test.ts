import { describe, expect, it } from 'vitest';
import { cloneExternalContextSnapshot, createQuickFixRequest, type ExternalContextSnapshot } from './context';

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
});
