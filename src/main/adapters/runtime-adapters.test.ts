import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { CommandMediaPlaybackAdapter, CommandTextInsertionAdapter, ElectronGlobalShortcutAdapter, FallbackHotkeyAdapter, MacOSEventTapHotkeyAdapter, MacOSPermissionAdapter, WindowsPermissionAdapter, shortcutLabelToAccelerator, type NativeHotkeyHelperProcess } from './runtime-adapters';

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


  it('uses a macOS event-tap helper for key-down and key-up callbacks', async () => {
    const helper = fakeNativeHotkeyProcess();
    const adapter = new MacOSEventTapHotkeyAdapter({
      command: '/tmp/whispree-hotkey-helper',
      readyTimeoutMs: 50,
      launch: vi.fn(() => helper.process),
    });
    const pressed = vi.fn();
    const released = vi.fn();
    const registration = adapter.register('⌃⇧R', pressed, released);
    await new Promise((resolve) => setTimeout(resolve, 0));

    helper.stdout.emit('data', '{"type":"ready"}\n');
    await registration;
    helper.stdout.emit('data', '{"type":"pressed"}\n{"type":"released"}\n');

    expect(adapter.supportsKeyRelease).toBe(true);
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(released).toHaveBeenCalledTimes(1);
    await adapter.unregister('⌃⇧R');
    expect(helper.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('falls back to Electron globalShortcut when the event-tap helper is not ready', async () => {
    const helper = fakeNativeHotkeyProcess();
    const globalRegister = vi.fn((_shortcut: string, callback: () => void) => {
      callback();
      return true;
    });
    const fallback = new ElectronGlobalShortcutAdapter({ register: globalRegister, unregister: vi.fn() }, 'macos');
    const adapter = new FallbackHotkeyAdapter(
      new MacOSEventTapHotkeyAdapter({ command: '/tmp/missing-helper', readyTimeoutMs: 1, launch: vi.fn(() => helper.process) }),
      fallback,
    );
    const pressed = vi.fn();
    const released = vi.fn();

    await adapter.register('⌃⇧R', pressed, released);

    expect(adapter.supportsKeyRelease).toBe(false);
    expect(globalRegister).toHaveBeenCalledWith('Control+Shift+R', expect.any(Function));
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(released).not.toHaveBeenCalled();
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



  it('opens Windows Settings URI panes and returns manual states for non-media permissions', async () => {
    const opened: string[] = [];
    const adapter = new WindowsPermissionAdapter(
      {
        getMediaAccessStatus: (media) => media === 'microphone' ? 'not-determined' : 'unknown',
        askForMediaAccess: async () => true,
      },
      { openExternal: async (url) => opened.push(url) },
    );

    await expect(adapter.query('microphone')).resolves.toBe('prompt-required');
    await expect(adapter.request('microphone')).resolves.toBe('granted');
    await expect(adapter.query('browser-context')).resolves.toBe('manual-required');
    await expect(adapter.request('terminal-context')).resolves.toBe('manual-required');
    await adapter.openSettings('accessibility');

    expect(opened).toEqual(expect.arrayContaining([
      'ms-settings:defaultapps',
      'ms-settings:easeofaccess-keyboard',
    ]));
  });

  it('pastes through OS command and falls back to clipboard on command failure', async () => {
    const copied: string[] = [];
    const inserted = new CommandTextInsertionAdapter('macos', { readText: () => 'previous', writeText: (text) => copied.push(text) }, async () => ({ ok: true, stdout: '', stderr: '' }), 0);
    await expect(inserted.insertText('hello', null)).resolves.toBe('inserted');
    expect(copied).toEqual(['hello']);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(copied.at(-1)).toBe('previous');

    const fallback = new CommandTextInsertionAdapter('windows', { writeText: (text) => copied.push(text) }, async () => ({ ok: false, stdout: '', stderr: 'denied' }));
    await expect(fallback.insertText('world', null)).resolves.toBe('copied-to-clipboard');
    expect(copied.at(-1)).toBe('world');
  });

  it('pauses and resumes media playback through command runner seam', async () => {
    const commands: string[] = [];
    const adapter = new CommandMediaPlaybackAdapter('macos', async (command, args) => {
      commands.push(`${command} ${args.join(' ')}`);
      return { ok: true, stdout: '', stderr: '' };
    });

    await adapter.pauseIfPlaying();
    await adapter.resumeIfPaused();
    await adapter.resumeIfPaused();

    expect(commands).toHaveLength(2);
    expect(commands[0]).toContain('Music');
    expect(commands[1]).toContain('Spotify');
  });
});


function fakeNativeHotkeyProcess(): {
  readonly stdout: EventEmitter;
  readonly stderr: EventEmitter;
  readonly kill: ReturnType<typeof vi.fn>;
  readonly process: NativeHotkeyHelperProcess;
} {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const lifecycle = new EventEmitter();
  const kill = vi.fn();
  return {
    stdout,
    stderr,
    kill,
    process: {
      stdout,
      stderr,
      on: (event, listener) => lifecycle.on(event, listener),
      kill,
    },
  };
}
