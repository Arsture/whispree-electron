import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  applySettingsUpdate,
  defaultPersistedAppSettings,
  normalizePersistedSettings,
  redactSettings,
  validateSettingsUpdate,
  type AppSettingsSnapshot,
  type PersistedAppSettingsSnapshot,
} from '../shared/settings';
import type { CloudCredentialBoundary, CloudProviderKind } from './cloud-provider-requests';

export interface SettingsStorePaths {
  readonly settingsFile: string;
}

export class FileSettingsStore implements CloudCredentialBoundary {
  readonly #settingsFile: string;
  #settings: PersistedAppSettingsSnapshot = defaultPersistedAppSettings;
  #groqApiKey: string | null = null;
  #lastError: string | null = null;

  constructor(paths: SettingsStorePaths) {
    this.#settingsFile = paths.settingsFile;
  }

  get lastError(): string | null {
    return this.#lastError;
  }

  getSnapshot(): AppSettingsSnapshot {
    return redactSettings(this.#settings, { groqApiKey: this.#groqApiKey });
  }

  getPersistedSnapshotForTests(): PersistedAppSettingsSnapshot {
    return this.#settings;
  }

  async getSecret(kind: CloudProviderKind): Promise<string | null> {
    if (kind === 'groq') return firstNonEmpty(this.#groqApiKey, process.env.GROQ_API_KEY);
    return firstNonEmpty(process.env.OPENAI_API_KEY);
  }

  async load(): Promise<AppSettingsSnapshot> {
    try {
      const text = await readFile(this.#settingsFile, 'utf8');
      this.#settings = normalizePersistedSettings(JSON.parse(text));
      this.#groqApiKey = null;
      this.#lastError = null;
    } catch (error) {
      if (isFileMissing(error)) {
        this.#settings = defaultPersistedAppSettings;
        this.#groqApiKey = null;
        this.#lastError = null;
      } else {
        this.#settings = defaultPersistedAppSettings;
        this.#groqApiKey = null;
        this.#lastError = error instanceof Error ? error.message : String(error);
      }
    }
    return this.getSnapshot();
  }

  async updateUnknown(value: unknown): Promise<{ readonly ok: true; readonly settings: AppSettingsSnapshot } | { readonly ok: false; readonly issues: readonly string[]; readonly settings: AppSettingsSnapshot }> {
    const validation = validateSettingsUpdate(value);
    if (!validation.ok) return { ok: false, issues: validation.issues, settings: this.getSnapshot() };
    if (validation.update.groqApiKey !== undefined) this.#groqApiKey = validation.update.groqApiKey;
    this.#settings = applySettingsUpdate(this.#settings, validation.update);
    await this.#persist();
    return { ok: true, settings: this.getSnapshot() };
  }

  async reset(): Promise<AppSettingsSnapshot> {
    this.#settings = defaultPersistedAppSettings;
    this.#groqApiKey = null;
    await this.#persist();
    return this.getSnapshot();
  }

  async #persist(): Promise<void> {
    await mkdir(path.dirname(this.#settingsFile), { recursive: true });
    const tmpFile = `${this.#settingsFile}.tmp`;
    await writeFile(tmpFile, `${JSON.stringify(this.#settings, null, 2)}\n`, 'utf8');
    await rename(tmpFile, this.#settingsFile);
    this.#lastError = null;
  }
}

export function createSettingsStore(userDataPath: string): FileSettingsStore {
  return new FileSettingsStore({ settingsFile: path.join(userDataPath, 'settings.json') });
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function firstNonEmpty(...values: readonly (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}
