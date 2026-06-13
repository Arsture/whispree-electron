export type RecordingMode = 'push-to-talk' | 'toggle';
export type SupportedLanguage = 'auto' | 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt';
export type CorrectionMode = 'standard' | 'filler-removal' | 'structured' | 'custom';
export type STTProviderType = 'mock' | 'whisperkit' | 'groq' | 'mlx-audio';
export type LLMProviderType = 'none' | 'mock' | 'local' | 'openai' | 'groq';
export type OpenAIModelId = 'gpt-5.5' | 'gpt-5.4' | 'gpt-5.4-mini' | 'gpt-5.3-codex' | 'gpt-5.2';
export type GroqLLMModelId =
  | 'meta-llama/llama-4-scout-17b-16e-instruct'
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'qwen/qwen3-32b'
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b';

export interface DomainWordSet {
  readonly id: string;
  readonly name: string;
  readonly words: readonly string[];
  readonly corrections: readonly CorrectionMapping[];
  readonly isEnabled: boolean;
}

export interface CorrectionMapping {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface WhispreeShortcutSnapshot {
  readonly kind: 'combo' | 'modifier-only';
  readonly keyCode: number;
  readonly modifiersRaw?: number;
  readonly label: string;
}

export interface AppSettingsSnapshot {
  readonly schemaVersion: 1;
  readonly recordingMode: RecordingMode;
  readonly language: SupportedLanguage;
  readonly sttProviderType: STTProviderType;
  readonly llmProviderType: LLMProviderType;
  readonly llmEnabled: boolean;
  readonly hasCompletedOnboarding: boolean;
  readonly launchAtLogin: boolean;
  readonly showOverlay: boolean;
  readonly correctionMode: CorrectionMode;
  readonly customLLMPrompt: string | null;
  readonly whisperModelId: string;
  readonly llmModelId: string;
  readonly mlxAudioModelId: string;
  readonly openaiModel: OpenAIModelId;
  readonly groqLLMModel: GroqLLMModelId;
  readonly screenshotContextEnabled: boolean;
  readonly screenshotPasteEnabled: boolean;
  readonly groqApiKeyConfigured: boolean;
  readonly audioInputChannel: number;
  readonly vadEnabled: boolean;
  readonly pauseMediaDuringRecording: boolean;
  readonly restoreBrowserTab: boolean;
  readonly restoreTerminalContext: boolean;
  readonly domainWordSets: readonly DomainWordSet[];
  readonly correctionMappings: readonly CorrectionMapping[];
  readonly sharedDictionaryEnabled: boolean;
  readonly sharedDictionaryPath: string | null;
  readonly toggleRecordingShortcut: WhispreeShortcutSnapshot;
  readonly quickFixShortcut: WhispreeShortcutSnapshot;
}

export type PersistedAppSettingsSnapshot = Omit<AppSettingsSnapshot, 'groqApiKeyConfigured'>;

export type AppSettingsUpdate = Partial<
  Omit<AppSettingsSnapshot, 'schemaVersion' | 'groqApiKeyConfigured'> & {
    readonly groqApiKey: string;
  }
>;

export const RECORDING_MODES: readonly RecordingMode[] = ['push-to-talk', 'toggle'];
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['auto', 'ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt'];
export const CORRECTION_MODES: readonly CorrectionMode[] = ['standard', 'filler-removal', 'structured', 'custom'];
export const STT_PROVIDER_TYPES: readonly STTProviderType[] = ['mock', 'whisperkit', 'groq', 'mlx-audio'];
export const LLM_PROVIDER_TYPES: readonly LLMProviderType[] = ['none', 'mock', 'local', 'openai', 'groq'];
export const OPENAI_MODELS: readonly OpenAIModelId[] = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex', 'gpt-5.2'];
export const GROQ_LLM_MODELS: readonly GroqLLMModelId[] = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

export const defaultToggleRecordingShortcut: WhispreeShortcutSnapshot = {
  kind: 'combo',
  keyCode: 15,
  modifiersRaw: 393216,
  label: '⌃⇧R',
};

export const defaultQuickFixShortcut: WhispreeShortcutSnapshot = {
  kind: 'combo',
  keyCode: 2,
  modifiersRaw: 393216,
  label: '⌃⇧D',
};

export const defaultPersistedAppSettings: PersistedAppSettingsSnapshot = {
  schemaVersion: 1,
  recordingMode: 'push-to-talk',
  language: 'ko',
  sttProviderType: 'whisperkit',
  llmProviderType: 'none',
  llmEnabled: true,
  hasCompletedOnboarding: false,
  launchAtLogin: false,
  showOverlay: true,
  correctionMode: 'standard',
  customLLMPrompt: null,
  whisperModelId: 'openai_whisper-large-v3_turbo',
  llmModelId: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
  mlxAudioModelId: 'mlx-community/Qwen3-ASR-1.7B-8bit',
  openaiModel: 'gpt-5.5',
  groqLLMModel: 'qwen/qwen3-32b',
  screenshotContextEnabled: false,
  screenshotPasteEnabled: false,
  audioInputChannel: 0,
  vadEnabled: true,
  pauseMediaDuringRecording: true,
  restoreBrowserTab: true,
  restoreTerminalContext: true,
  domainWordSets: [],
  correctionMappings: [],
  sharedDictionaryEnabled: false,
  sharedDictionaryPath: null,
  toggleRecordingShortcut: defaultToggleRecordingShortcut,
  quickFixShortcut: defaultQuickFixShortcut,
};

export const defaultAppSettings: AppSettingsSnapshot = redactSettings(defaultPersistedAppSettings);

export function redactSettings(
  settings: PersistedAppSettingsSnapshot,
  secrets: { readonly groqApiKey?: string | null } = {},
): AppSettingsSnapshot {
  const publicSettings = normalizePersistedSettings(settings);
  return {
    ...publicSettings,
    groqApiKeyConfigured: typeof secrets.groqApiKey === 'string' && secrets.groqApiKey.trim().length > 0,
  };
}

export function normalizeCorrectionMode(raw: string): CorrectionMode {
  if (raw === 'promptEngineering' || raw === 'fillerRemoval') return 'filler-removal';
  if (isOneOf(CORRECTION_MODES, raw)) return raw;
  return defaultPersistedAppSettings.correctionMode;
}

export function normalizeSTTProviderType(raw: string): STTProviderType {
  if (raw === 'WhisperKit') return 'whisperkit';
  if (raw === 'Groq') return 'groq';
  if (raw === 'MLX Audio') return 'mlx-audio';
  if (isOneOf(STT_PROVIDER_TYPES, raw)) return raw;
  return defaultPersistedAppSettings.sttProviderType;
}

export function normalizeLLMProviderType(raw: string): LLMProviderType {
  if (raw === '없음 (원문 사용)') return 'none';
  if (raw === '로컬 MLX' || raw === '로컬 LLM (Qwen3)') return 'local';
  if (raw === 'OpenAI (GPT)') return 'openai';
  if (raw === 'Groq Cloud') return 'groq';
  if (isOneOf(LLM_PROVIDER_TYPES, raw)) return raw;
  return defaultPersistedAppSettings.llmProviderType;
}

export function normalizeOpenAIModel(raw: string): OpenAIModelId {
  const aliased = raw === 'gpt-5.3-codex-spark' ? 'gpt-5.4-mini' : raw === 'gpt-5.2-codex' ? 'gpt-5.2' : raw;
  if (isOneOf(OPENAI_MODELS, aliased)) return aliased;
  return defaultPersistedAppSettings.openaiModel;
}

export function normalizeGroqLLMModel(raw: string): GroqLLMModelId {
  if (isOneOf(GROQ_LLM_MODELS, raw)) return raw;
  return defaultPersistedAppSettings.groqLLMModel;
}

export function normalizePersistedSettings(raw: unknown): PersistedAppSettingsSnapshot {
  const source = isRecord(raw) ? raw : {};
  const contextEnabled = boolOr(source.isScreenshotContextEnabled ?? source.screenshotContextEnabled, defaultPersistedAppSettings.screenshotContextEnabled);
  const pasteEnabled = contextEnabled
    ? boolOr(source.isScreenshotPasteEnabled ?? source.screenshotPasteEnabled, defaultPersistedAppSettings.screenshotPasteEnabled)
    : false;

  return {
    schemaVersion: 1,
    recordingMode: normalizeRecordingMode(source.recordingMode),
    language: normalizeLanguage(source.language),
    sttProviderType: normalizeSTTProviderType(String(source.sttProviderType ?? defaultPersistedAppSettings.sttProviderType)),
    llmProviderType: normalizeLLMProviderType(String(source.llmProviderType ?? defaultPersistedAppSettings.llmProviderType)),
    llmEnabled: boolOr(source.isLLMEnabled ?? source.llmEnabled, defaultPersistedAppSettings.llmEnabled),
    hasCompletedOnboarding: boolOr(source.hasCompletedOnboarding, defaultPersistedAppSettings.hasCompletedOnboarding),
    launchAtLogin: boolOr(source.launchAtLogin, defaultPersistedAppSettings.launchAtLogin),
    showOverlay: boolOr(source.showOverlay, defaultPersistedAppSettings.showOverlay),
    correctionMode: normalizeCorrectionMode(String(source.correctionMode ?? defaultPersistedAppSettings.correctionMode)),
    customLLMPrompt: nullableString(source.customLLMPrompt, defaultPersistedAppSettings.customLLMPrompt),
    whisperModelId: stringOr(source.whisperModelId, defaultPersistedAppSettings.whisperModelId),
    llmModelId: migrateLLMModelId(stringOr(source.llmModelId, defaultPersistedAppSettings.llmModelId)),
    mlxAudioModelId: stringOr(source.mlxAudioModelId, defaultPersistedAppSettings.mlxAudioModelId),
    openaiModel: normalizeOpenAIModel(String(source.openaiModel ?? defaultPersistedAppSettings.openaiModel)),
    groqLLMModel: normalizeGroqLLMModel(String(source.groqLLMModel ?? defaultPersistedAppSettings.groqLLMModel)),
    screenshotContextEnabled: contextEnabled,
    screenshotPasteEnabled: pasteEnabled,
    audioInputChannel: nonNegativeIntegerOr(source.audioInputChannel, defaultPersistedAppSettings.audioInputChannel),
    vadEnabled: boolOr(source.vadEnabled, defaultPersistedAppSettings.vadEnabled),
    pauseMediaDuringRecording: boolOr(source.pauseMediaDuringRecording, defaultPersistedAppSettings.pauseMediaDuringRecording),
    restoreBrowserTab: boolOr(source.restoreBrowserTab, defaultPersistedAppSettings.restoreBrowserTab),
    restoreTerminalContext: boolOr(source.restoreTerminalContext, defaultPersistedAppSettings.restoreTerminalContext),
    domainWordSets: normalizeDomainWordSets(source.domainWordSets),
    correctionMappings: normalizeCorrectionMappings(source.correctionMappings),
    sharedDictionaryEnabled: boolOr(source.sharedDictionaryEnabled, defaultPersistedAppSettings.sharedDictionaryEnabled),
    sharedDictionaryPath: nullableString(source.sharedDictionaryPath, defaultPersistedAppSettings.sharedDictionaryPath),
    toggleRecordingShortcut: normalizeShortcut(source.toggleRecordingShortcut, defaultToggleRecordingShortcut),
    quickFixShortcut: normalizeShortcut(source.quickFixShortcut, defaultQuickFixShortcut),
  };
}

export function validateSettingsUpdate(value: unknown): { readonly ok: true; readonly update: AppSettingsUpdate } | { readonly ok: false; readonly issues: readonly string[] } {
  if (!isRecord(value)) return { ok: false, issues: ['settings update must be an object'] };

  const issues: string[] = [];
  const update: AppSettingsUpdate = {};
  const mutableUpdate = update as Record<string, unknown>;

  for (const [key, rawValue] of Object.entries(value)) {
    switch (key) {
      case 'recordingMode':
        assignOneOf(mutableUpdate, key, rawValue, RECORDING_MODES, issues);
        break;
      case 'language':
        assignOneOf(mutableUpdate, key, rawValue, SUPPORTED_LANGUAGES, issues);
        break;
      case 'sttProviderType':
        assignOneOf(mutableUpdate, key, rawValue, STT_PROVIDER_TYPES, issues);
        break;
      case 'llmProviderType':
        assignOneOf(mutableUpdate, key, rawValue, LLM_PROVIDER_TYPES, issues);
        break;
      case 'correctionMode':
        assignOneOf(mutableUpdate, key, rawValue, CORRECTION_MODES, issues);
        break;
      case 'openaiModel':
        assignOneOf(mutableUpdate, key, rawValue, OPENAI_MODELS, issues);
        break;
      case 'groqLLMModel':
        assignOneOf(mutableUpdate, key, rawValue, GROQ_LLM_MODELS, issues);
        break;
      case 'llmEnabled':
      case 'hasCompletedOnboarding':
      case 'launchAtLogin':
      case 'showOverlay':
      case 'screenshotContextEnabled':
      case 'screenshotPasteEnabled':
      case 'vadEnabled':
      case 'pauseMediaDuringRecording':
      case 'restoreBrowserTab':
      case 'restoreTerminalContext':
      case 'sharedDictionaryEnabled':
        if (typeof rawValue === 'boolean') mutableUpdate[key] = rawValue;
        else issues.push(`${key} must be a boolean`);
        break;
      case 'customLLMPrompt':
      case 'sharedDictionaryPath':
        if (rawValue === null || typeof rawValue === 'string') mutableUpdate[key] = rawValue;
        else issues.push(`${key} must be a string or null`);
        break;
      case 'whisperModelId':
      case 'llmModelId':
      case 'mlxAudioModelId':
      case 'groqApiKey':
        if (typeof rawValue === 'string') mutableUpdate[key] = rawValue;
        else issues.push(`${key} must be a string`);
        break;
      case 'audioInputChannel':
        if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue >= 0) mutableUpdate[key] = rawValue;
        else issues.push('audioInputChannel must be a non-negative integer');
        break;
      case 'domainWordSets': {
        const result = validateDomainWordSetsForUpdate(rawValue);
        if (result.ok) mutableUpdate[key] = result.value;
        else issues.push(...result.issues);
        break;
      }
      case 'correctionMappings': {
        const result = validateCorrectionMappingsForUpdate(rawValue, 'correctionMappings');
        if (result.ok) mutableUpdate[key] = result.value;
        else issues.push(...result.issues);
        break;
      }
      case 'toggleRecordingShortcut':
      case 'quickFixShortcut':
        if (isValidShortcut(rawValue)) mutableUpdate[key] = normalizeShortcut(rawValue, key === 'toggleRecordingShortcut' ? defaultToggleRecordingShortcut : defaultQuickFixShortcut);
        else issues.push(`${key} must be a shortcut object`);
        break;
      default:
        issues.push(`unknown settings key: ${key}`);
    }
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, update };
}

export function applySettingsUpdate(current: PersistedAppSettingsSnapshot, update: AppSettingsUpdate): PersistedAppSettingsSnapshot {
  const { groqApiKey: _groqApiKey, ...persistableUpdate } = update;
  return normalizePersistedSettings({ ...current, ...persistableUpdate });
}

function normalizeRecordingMode(value: unknown): RecordingMode {
  if (value === 'pushToTalk') return 'push-to-talk';
  if (isOneOf(RECORDING_MODES, value)) return value;
  return defaultPersistedAppSettings.recordingMode;
}

function normalizeLanguage(value: unknown): SupportedLanguage {
  if (value === 'korean') return 'ko';
  if (value === 'english') return 'en';
  if (value === 'japanese') return 'ja';
  if (value === 'chinese') return 'zh';
  if (isOneOf(SUPPORTED_LANGUAGES, value)) return value;
  return defaultPersistedAppSettings.language;
}

function normalizeDomainWordSets(value: unknown): readonly DomainWordSet[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => ({
    id: stringOr(item.id, `word-set-${index}`),
    name: stringOr(item.name, 'Untitled'),
    words: Array.isArray(item.words) ? item.words.filter((word): word is string => typeof word === 'string') : [],
    corrections: Array.isArray(item.corrections)
      ? item.corrections.filter(isRecord).map((correction, correctionIndex) => ({
          id: stringOr(correction.id, `correction-${index}-${correctionIndex}`),
          from: stringOr(correction.from, ''),
          to: stringOr(correction.to, ''),
        }))
      : [],
    isEnabled: boolOr(item.isEnabled, true),
  }));
}


function normalizeCorrectionMappings(value: unknown): readonly CorrectionMapping[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((correction, index) => ({
    id: stringOr(correction.id, `mapping-${index}`),
    from: stringOr(correction.from, ''),
    to: stringOr(correction.to, ''),
  }));
}

function validateDomainWordSetsForUpdate(value: unknown): { readonly ok: true; readonly value: readonly DomainWordSet[] } | { readonly ok: false; readonly issues: readonly string[] } {
  if (!Array.isArray(value)) return { ok: false, issues: ['domainWordSets must be an array'] };
  const issues: string[] = [];
  const sets: DomainWordSet[] = [];

  value.forEach((item, index) => {
    const prefix = `domainWordSets[${index}]`;
    if (!isRecord(item)) {
      issues.push(`${prefix} must be an object`);
      return;
    }

    const id = requireString(item.id, `${prefix}.id`, issues);
    const name = requireString(item.name, `${prefix}.name`, issues);
    const words = validateStringArray(item.words, `${prefix}.words`, issues);
    const corrections = validateCorrectionMappingsForUpdate(item.corrections, `${prefix}.corrections`);
    if (!corrections.ok) issues.push(...corrections.issues);
    if (typeof item.isEnabled !== 'boolean') issues.push(`${prefix}.isEnabled must be a boolean`);

    if (id && name && words && corrections.ok && typeof item.isEnabled === 'boolean') {
      sets.push({ id, name, words, corrections: corrections.value, isEnabled: item.isEnabled });
    }
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: sets };
}

function validateCorrectionMappingsForUpdate(value: unknown, path: string): { readonly ok: true; readonly value: readonly CorrectionMapping[] } | { readonly ok: false; readonly issues: readonly string[] } {
  if (!Array.isArray(value)) return { ok: false, issues: [`${path} must be an array`] };
  const issues: string[] = [];
  const mappings: CorrectionMapping[] = [];

  value.forEach((item, index) => {
    const prefix = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push(`${prefix} must be an object`);
      return;
    }

    const id = requireString(item.id, `${prefix}.id`, issues);
    const from = requireString(item.from, `${prefix}.from`, issues);
    const to = requireString(item.to, `${prefix}.to`, issues);
    if (id && from && to) mappings.push({ id, from, to });
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: mappings };
}

function validateStringArray(value: unknown, path: string, issues: string[]): readonly string[] | null {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array of strings`);
    return null;
  }
  const strings: string[] = [];
  value.forEach((item, index) => {
    if (typeof item === 'string') strings.push(item);
    else issues.push(`${path}[${index}] must be a string`);
  });
  return strings;
}

function requireString(value: unknown, path: string, issues: string[]): string | null {
  if (typeof value === 'string') return value;
  issues.push(`${path} must be a string`);
  return null;
}

function normalizeShortcut(value: unknown, fallback: WhispreeShortcutSnapshot): WhispreeShortcutSnapshot {
  if (!isRecord(value)) return fallback;
  const kind = value.kind === 'modifier-only' ? 'modifier-only' : 'combo';
  const keyCode = nonNegativeIntegerOr(value.keyCode, fallback.keyCode);
  const modifiersRaw = kind === 'combo' ? nonNegativeIntegerOr(value.modifiersRaw, fallback.modifiersRaw ?? 0) : undefined;
  const label = stringOr(value.label, fallback.label);
  return modifiersRaw === undefined ? { kind, keyCode, label } : { kind, keyCode, modifiersRaw, label };
}

function isValidShortcut(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.kind !== 'combo' && value.kind !== 'modifier-only') return false;
  if (typeof value.keyCode !== 'number' || !Number.isInteger(value.keyCode) || value.keyCode < 0) return false;
  if (value.kind === 'combo' && (typeof value.modifiersRaw !== 'number' || !Number.isInteger(value.modifiersRaw) || value.modifiersRaw < 0)) return false;
  return typeof value.label === 'string' && value.label.length > 0;
}

function assignOneOf<const T extends readonly string[]>(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  allowedValues: T,
  issues: string[],
): void {
  if (isOneOf(allowedValues, value)) {
    target[key] = value;
    return;
  }
  issues.push(`${key} must be one of: ${allowedValues.join(', ')}`);
}

function migrateLLMModelId(value: string): string {
  return value.includes('Qwen2.5') ? defaultPersistedAppSettings.llmModelId : value;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown, fallback: string | null): string | null {
  if (value === null || value === undefined) return fallback;
  return typeof value === 'string' ? (value.length > 0 ? value : null) : fallback;
}

function nonNegativeIntegerOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}
