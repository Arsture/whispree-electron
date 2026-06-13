import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultPersistedAppSettings } from '../shared/settings';
import { FileSettingsStore } from './settings-store';

async function tempStore() {
  const dir = await mkdtemp(path.join(tmpdir(), 'whispree-settings-'));
  const store = new FileSettingsStore({ settingsFile: path.join(dir, 'settings.json') });
  return { dir, store, file: path.join(dir, 'settings.json') };
}

describe('FileSettingsStore', () => {
  it('loads defaults when no settings file exists', async () => {
    const { dir, store } = await tempStore();
    try {
      const settings = await store.load();
      expect(settings.recordingMode).toBe('push-to-talk');
      expect(settings.sttProviderType).toBe('whisperkit');
      expect(settings.groqApiKeyConfigured).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('persists updates atomically and redacts secrets from public snapshots', async () => {
    const { dir, store, file } = await tempStore();
    try {
      await store.load();
      const result = await store.updateUnknown({ recordingMode: 'toggle', groqApiKey: 'gsk_test_123' });
      expect(result).toMatchObject({ ok: true, settings: { recordingMode: 'toggle', groqApiKeyConfigured: true } });
      expect(JSON.stringify(result)).not.toContain('gsk_test_123');
      const persisted = JSON.parse(await readFile(file, 'utf8')) as typeof defaultPersistedAppSettings;
      expect(persisted.groqApiKey).toBe('gsk_test_123');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects invalid update objects without mutating current settings', async () => {
    const { dir, store } = await tempStore();
    try {
      await store.load();
      const result = await store.updateUnknown({ unknown: true });
      expect(result.ok).toBe(false);
      expect(store.getSnapshot().recordingMode).toBe('push-to-talk');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('falls back to defaults and exposes a local error on corrupt JSON', async () => {
    const { dir, store, file } = await tempStore();
    try {
      await writeFile(file, '{not json', 'utf8');
      const settings = await store.load();
      expect(settings.recordingMode).toBe(defaultPersistedAppSettings.recordingMode);
      expect(store.lastError).toContain('JSON');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
