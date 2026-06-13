import { describe, expect, it, vi } from 'vitest';
import { CommandTextInsertionAdapter, ElectronGlobalShortcutAdapter, MacOSPermissionAdapter, shortcutLabelToAccelerator } from './runtime-adapters';

describe('runtime adapters', () => {
  it('maps Swift shortcut labels to Electron accelerators', () => {
    expect(shortcutLabelToAccelerator('⌃⇧R')).toBe('Control+Shift+R');
    expect(shortcutLabelToAccelerator('⌘⇧Space')).toBe('CommandOrControl+Shift+Space');
    expect(shortcutLabelToAccelerator('esc')).toBe('Escape');
  });

  it('uses Electron globalShortcut bridge and reports registration failure', async () => {
    const register = vi.fn(() => true);
    const unregister = vi.fn();
    const adapter = new ElectronGlobalShortcutAdapter({ register, unregister }, 'macos');

    await adapter.register('⌃⇧R', () => undefined);
    expect(register).toHaveBeenCalledWith('Control+Shift+R', expect.any(Function));
    await adapter.unregister('⌃⇧R');
    expect(unregister).toHaveBeenCalledWith('Control+Shift+R');

    const failing = new ElectronGlobalShortcutAdapter({ register: () => false, unregister: () => undefined }, 'macos');
    await expect(failing.register('⌃⇧R', () => undefined)).rejects.toThrow('Unable to register global shortcut');
  });

  it('queries and requests macOS microphone/accessibility permissions through injected Electron bridge', async () => {
    const opened: string[] = [];
    const adapter = new MacOSPermissionAdapter(
      {
        getMediaAccessStatus: (media) => media === 'microphone' ? 'not-determined' : 'granted',
        askForMediaAccess: async () => true,
        isTrustedAccessibilityClient: (prompt) => prompt,
      },
      { openExternal: async (url) => opened.push(url) },
    );

    await expect(adapter.query('microphone')).resolves.toBe('prompt-required');
    await expect(adapter.request('microphone')).resolves.toBe('granted');
    await expect(adapter.query('accessibility')).resolves.toBe('prompt-required');
    await expect(adapter.request('accessibility')).resolves.toBe('granted');
    await adapter.openSettings('screen-recording');
    expect(opened[0]).toContain('Privacy_ScreenCapture');
  });

  it('pastes through OS command and falls back to clipboard on command failure', async () => {
    const copied: string[] = [];
    const inserted = new CommandTextInsertionAdapter('macos', { writeText: (text) => copied.push(text) }, async () => ({ ok: true, stdout: '', stderr: '' }));
    await expect(inserted.insertText('hello', null)).resolves.toBe('inserted');
    expect(copied).toEqual(['hello']);

    const fallback = new CommandTextInsertionAdapter('windows', { writeText: (text) => copied.push(text) }, async () => ({ ok: false, stdout: '', stderr: 'denied' }));
    await expect(fallback.insertText('world', null)).resolves.toBe('copied-to-clipboard');
    expect(copied.at(-1)).toBe('world');
  });
});
