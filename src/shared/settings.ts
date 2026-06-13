export type RecordingMode = 'push-to-talk' | 'toggle';
export type SupportedLanguage = 'auto' | 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt';
export type CorrectionMode = 'standard' | 'filler-removal' | 'structured' | 'custom';
export type STTProviderType = 'mock' | 'whisperkit' | 'groq' | 'mlx-audio';
export type LLMProviderType = 'none' | 'mock' | 'local' | 'openai' | 'groq';

export interface DomainWordSet {
  readonly id: string;
  readonly name: string;
  readonly words: readonly string[];
}

export interface CorrectionMapping {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface AppSettingsSnapshot {
  readonly recordingMode: RecordingMode;
  readonly language: SupportedLanguage;
  readonly sttProviderType: STTProviderType;
  readonly llmProviderType: LLMProviderType;
  readonly llmEnabled: boolean;
  readonly correctionMode: CorrectionMode;
  readonly customLLMPrompt: string | null;
  readonly screenshotContextEnabled: boolean;
  readonly screenshotPasteEnabled: boolean;
  readonly restoreBrowserTab: boolean;
  readonly restoreTerminalContext: boolean;
  readonly pauseMediaDuringRecording: boolean;
  readonly vadEnabled: boolean;
  readonly domainWordSets: readonly DomainWordSet[];
  readonly correctionMappings: readonly CorrectionMapping[];
}

export const defaultAppSettings: AppSettingsSnapshot = {
  recordingMode: 'push-to-talk',
  language: 'ko',
  sttProviderType: 'mock',
  llmProviderType: 'mock',
  llmEnabled: true,
  correctionMode: 'standard',
  customLLMPrompt: null,
  screenshotContextEnabled: false,
  screenshotPasteEnabled: false,
  restoreBrowserTab: true,
  restoreTerminalContext: true,
  pauseMediaDuringRecording: true,
  vadEnabled: true,
  domainWordSets: [],
  correctionMappings: [],
};

export function normalizeCorrectionMode(raw: string): CorrectionMode {
  if (raw === 'promptEngineering') return 'filler-removal';
  if (raw === 'standard' || raw === 'filler-removal' || raw === 'structured' || raw === 'custom') {
    return raw;
  }
  return defaultAppSettings.correctionMode;
}
