import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultPersistedAppSettings } from '../shared/settings';
import { FileSettingsStore } from './settings-store';

const originalOpenAiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

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

  it('persists updates atomically without writing raw secrets to disk', async () => {
    const { dir, store, file } = await tempStore();
    try {
      await store.load();
      const result = await store.updateUnknown({ recordingMode: 'toggle', groqApiKey: 'gsk_test_123' });
      expect(result).toMatchObject({ ok: true, settings: { recordingMode: 'toggle', groqApiKeyConfigured: true } });
      expect(JSON.stringify(result)).not.toContain('gsk_test_123');
      const persistedText = await readFile(file, 'utf8');
      const persisted = JSON.parse(persistedText) as typeof defaultPersistedAppSettings;
      expect(persisted.recordingMode).toBe('toggle');
      expect(persistedText).not.toContain('gsk_test_123');
      expect('groqApiKey' in persisted).toBe(false);
      await expect(store.getSecret('groq')).resolves.toBe('gsk_test_123');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('requires an explicit OpenAI API key boundary instead of reading Codex auth implicitly', async () => {
    const { dir, store } = await tempStore();
    try {
      delete process.env.OPENAI_API_KEY;
      await store.load();
      await expect(store.getSecret('openai')).resolves.toBeNull();
      process.env.OPENAI_API_KEY = 'sk_explicit_env';
      await expect(store.getSecret('openai')).resolves.toBe('sk_explicit_env');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('drops legacy plaintext Groq keys on load instead of reserializing them', async () => {
    const { dir, store, file } = await tempStore();
    try {
      await writeFile(file, JSON.stringify({ ...defaultPersistedAppSettings, groqApiKey: 'gsk_legacy_plaintext' }), 'utf8');
      const settings = await store.load();
      expect(settings.groqApiKeyConfigured).toBe(false);
      await store.updateUnknown({ showOverlay: false });
      expect(await readFile(file, 'utf8')).not.toContain('gsk_legacy_plaintext');
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
