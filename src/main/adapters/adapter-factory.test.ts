import { describe, expect, it } from 'vitest';
import { createAdapterSet, normalizeRuntimePlatform, permissionCardsForAdapterSet, queryPermissionCardsForAdapterSet } from './adapter-factory';
import type { MockHotkeyAdapter } from './mock-adapters';

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
    expect(windows.platform).toBe('windows');
    expect(windows.audio.descriptor.status).toBe('not-tested');
  });

  it('projects permission cards with visible platform status labels', () => {
    expect(permissionCardsForAdapterSet(createAdapterSet('darwin')).every((card) => card.status === 'planned')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('win32')).every((card) => card.status === 'not-tested')).toBe(true);
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
});
