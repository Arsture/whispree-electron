import { describe, expect, it } from 'vitest';
import { createAdapterSet, normalizeRuntimePlatform, permissionCardsForAdapterSet } from './adapter-factory';
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

  it('creates macOS shell adapters as planned and Windows shell adapters as not-tested', () => {
    const macos = createAdapterSet('darwin');
    const windows = createAdapterSet('win32');

    expect(macos.platform).toBe('macos');
    expect(macos.audio.descriptor.status).toBe('planned');
    expect(windows.platform).toBe('windows');
    expect(windows.audio.descriptor.status).toBe('not-tested');
  });

  it('projects permission cards with visible platform status labels', () => {
    expect(permissionCardsForAdapterSet(createAdapterSet('darwin')).every((card) => card.status === 'planned')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('win32')).every((card) => card.status === 'not-tested')).toBe(true);
    expect(permissionCardsForAdapterSet(createAdapterSet('linux')).every((card) => card.status === 'unsupported')).toBe(true);
  });
});
