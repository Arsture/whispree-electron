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

export interface SettingsStorePaths {
  readonly settingsFile: string;
}

export class FileSettingsStore {
  readonly #settingsFile: string;
  #settings: PersistedAppSettingsSnapshot = defaultPersistedAppSettings;
  #lastError: string | null = null;

  constructor(paths: SettingsStorePaths) {
    this.#settingsFile = paths.settingsFile;
  }

  get lastError(): string | null {
    return this.#lastError;
  }

  getSnapshot(): AppSettingsSnapshot {
    return redactSettings(this.#settings);
  }

  getPersistedSnapshotForTests(): PersistedAppSettingsSnapshot {
    return this.#settings;
  }

  async load(): Promise<AppSettingsSnapshot> {
    try {
      const text = await readFile(this.#settingsFile, 'utf8');
      this.#settings = normalizePersistedSettings(JSON.parse(text));
      this.#lastError = null;
    } catch (error) {
      if (isFileMissing(error)) {
        this.#settings = defaultPersistedAppSettings;
        this.#lastError = null;
      } else {
        this.#settings = defaultPersistedAppSettings;
        this.#lastError = error instanceof Error ? error.message : String(error);
      }
    }
    return this.getSnapshot();
  }

  async updateUnknown(value: unknown): Promise<{ readonly ok: true; readonly settings: AppSettingsSnapshot } | { readonly ok: false; readonly issues: readonly string[]; readonly settings: AppSettingsSnapshot }> {
    const validation = validateSettingsUpdate(value);
    if (!validation.ok) return { ok: false, issues: validation.issues, settings: this.getSnapshot() };
    this.#settings = applySettingsUpdate(this.#settings, validation.update);
    await this.#persist();
    return { ok: true, settings: this.getSnapshot() };
  }

  async reset(): Promise<AppSettingsSnapshot> {
    this.#settings = defaultPersistedAppSettings;
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
