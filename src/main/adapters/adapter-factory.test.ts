import { describe, expect, it } from 'vitest';
import { createAdapterSet, normalizeRuntimePlatform, permissionCardsForAdapterSet, queryPermissionCardsForAdapterSet } from './adapter-factory';
import type { MockHotkeyAdapter } from './mock-adapters';

const alwaysRegisteringShortcutBridge = {
  register: () => true,
  unregister: () => undefined,
};

describe('adapter factory', () => {
  it('normalizes runtime platforms', () => {
    expect(normalizeRuntimePlatform('darwin')).toBe('macos');
    expect(normalizeRuntimePlatform('win32')).toBe('windows');
    expect(normalizeRuntimePlatform('linux')).toBe('unknown');
  });

  it('creates mock adapters with deterministic behavior', async () => {
    const adapters = createAdapterSet('darwin', 'mock');
    const hotkey = adapters.hotkey as MockHotkeyAdapter;
    let calls = 0;
    await hotkey.register('⌃⇧R', () => { calls += 1; });

    expect(hotkey.trigger('⌃⇧R')).toBe(true);
    expect(calls).toBe(1);
    await adapters.audio.start();
    await expect(adapters.audio.stop()).resolves.toEqual({ audioRef: 'mock-audio-ref' });
    await expect(adapters.textInsertion.insertText('hello', null)).resolves.toBe('inserted');
  });

  it('creates macOS shell adapters as partial where runtime bridges are available and Windows shell adapters as not-tested', () => {
    const macos = createAdapterSet('darwin');
    const windows = createAdapterSet('win32');

    expect(macos.platform).toBe('macos');
    expect(macos.audio.descriptor.status).toBe('partial');
    expect(macos.mediaPlayback.descriptor.status).toBe('partial');
    expect(windows.platform).toBe('windows');
    expect(windows.audio.descriptor.status).toBe('not-tested');
    expect(windows.mediaPlayback.descriptor.status).toBe('not-tested');
    expect(windows.textInsertion.descriptor.status).toBe('partial');
  });

  it('prefers a macOS native key-up helper behind a safe Electron fallback when configured', () => {
    const macos = createAdapterSet('darwin', 'shell', {
      globalShortcutBridge: alwaysRegisteringShortcutBridge,
      nativeHotkeyHelper: { command: '/Applications/Whispree.app/Contents/Resources/whispree-hotkey-helper' },
    });

    expect(macos.hotkey.descriptor.id).toContain('macos-event-tap-hotkey');
    expect(macos.hotkey.descriptor.detail).toContain('Falls back');
    expect(macos.hotkey.supportsKeyRelease).toBe(false);
  });

  it('keeps the Windows hotkey path press-only/not-tested and does not promote Windows key-up semantics', () => {
    const windows = createAdapterSet('win32', 'shell', {
      globalShortcutBridge: alwaysRegisteringShortcutBridge,
      nativeHotkeyHelper: { command: '/tmp/macos-only-helper' },
    });

    expect(windows.hotkey.descriptor.id).toBe('windows-global-shortcut');
    expect(windows.hotkey.supportsKeyRelease).toBe(false);
  });

  it('projects permission cards with visible platform status labels', () => {
    expect(permissionCardsForAdapterSet(createAdapterSet('darwin')).every((card) => card.status === 'partial')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('darwin')).every((card) => card.state === 'manual-required')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('win32')).every((card) => card.status === 'partial')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('linux')).every((card) => card.status === 'unsupported')).toBe(true);
  });

  it('queries runtime permission cards through injected bridges', async () => {
    const adapters = createAdapterSet('darwin', 'shell', {
      permissionBridge: {
        getMediaAccessStatus: (kind) => kind === 'microphone' ? 'granted' : 'not-determined',
        isTrustedAccessibilityClient: () => false,
      },
      externalUrlOpener: { openExternal: async () => undefined },
    });

    const cards = await queryPermissionCardsForAdapterSet(adapters);

    expect(cards.find((card) => card.kind === 'microphone')).toMatchObject({ state: 'granted', status: 'implemented' });
    expect(cards.find((card) => card.kind === 'accessibility')).toMatchObject({ state: 'prompt-required', status: 'partial' });
  });

  it('queries Windows permissions as manual or prompt-required through injected bridges', async () => {
    const opened: string[] = [];
    const adapters = createAdapterSet('win32', 'shell', {
      permissionBridge: { getMediaAccessStatus: () => 'not-determined' },
      externalUrlOpener: { openExternal: async (url) => opened.push(String(url)) },
    });

    const cards = await queryPermissionCardsForAdapterSet(adapters);
    expect(cards.find((card) => card.kind === 'microphone')).toMatchObject({ state: 'prompt-required', status: 'partial' });
    expect(cards.find((card) => card.kind === 'browser-context')).toMatchObject({ state: 'manual-required', status: 'partial' });
    await adapters.permission.request('terminal-context');
    expect(opened).toContain('ms-settings:defaultapps');
  });
});
