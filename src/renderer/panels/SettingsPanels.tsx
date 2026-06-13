import type { ChangeEvent, ReactNode } from 'react';
import {
  CORRECTION_MODES,
  GROQ_LLM_MODELS,
  LLM_PROVIDER_TYPES,
  OPENAI_MODELS,
  RECORDING_MODES,
  STT_PROVIDER_TYPES,
  SUPPORTED_LANGUAGES,
  type AppSettingsSnapshot,
  type AppSettingsUpdate,
  type CorrectionMode,
  type LLMProviderType,
  type OpenAIModelId,
  type RecordingMode,
  type STTProviderType,
  type SupportedLanguage,
} from '../../shared/settings';
import { implementationTone, type PlaceholderGroup, type SidebarSectionId } from '../ui-model';
import { StatusPill } from '../components/primitives';

interface SettingsPanelProps {
  readonly sectionId: Exclude<SidebarSectionId, 'home' | 'history'>;
  readonly groups: readonly PlaceholderGroup[];
  readonly settings: AppSettingsSnapshot;
  readonly onUpdateSettings: (update: AppSettingsUpdate) => Promise<void>;
}

const recordingModeLabels: Record<RecordingMode, string> = {
  'push-to-talk': 'Push to Talk — Hold key to record, release to transcribe',
  toggle: 'Toggle — Press to start, press again to stop',
};

const languageLabels: Record<SupportedLanguage, string> = {
  auto: 'Auto-detect',
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
};

const sttLabels: Record<STTProviderType, string> = {
  mock: 'Mock STT (테스트)',
  whisperkit: 'WhisperKit (로컬)',
  groq: 'Groq Cloud API',
  'mlx-audio': 'MLX Audio (로컬)',
  local: 'OS Local Sidecar',
};

const llmLabels: Record<LLMProviderType, string> = {
  none: '없음 (원문 사용)',
  mock: 'Mock Correction (테스트)',
  local: '로컬 MLX',
  openai: 'OpenAI (GPT)',
  groq: 'Groq Cloud',
};

const correctionLabels: Record<CorrectionMode, string> = {
  standard: 'Standard (STT Correction)',
  'filler-removal': 'Filler Removal',
  structured: 'Structured',
  custom: 'Custom',
};

export function SettingsPanel({ sectionId, groups, settings, onUpdateSettings }: SettingsPanelProps) {
  if (sectionId === 'general') return <GeneralSettingsPanel groups={groups} settings={settings} onUpdateSettings={onUpdateSettings} />;
  if (sectionId === 'stt') return <STTSettingsPanel groups={groups} settings={settings} onUpdateSettings={onUpdateSettings} />;
  if (sectionId === 'llm') return <LLMSettingsPanel groups={groups} settings={settings} onUpdateSettings={onUpdateSettings} />;
  if (sectionId === 'models') return <ModelsSettingsPanel groups={groups} settings={settings} />;
  return <WordSetsPanel groups={groups} settings={settings} />;
}

function GeneralSettingsPanel({ groups, settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId'>) {
  return (
    <div className="placeholder-grid" data-testid="settings-panel-general">
      <SettingsCard group={groups[0]!}>
        <ReadonlySetting label="Recording shortcut" value={settings.toggleRecordingShortcut.label} detail="Swift default Ctrl+Shift+R preserved." />
        <ReadonlySetting label="Quick Fix shortcut" value={settings.quickFixShortcut.label} detail="Swift default Ctrl+Shift+D preserved." />
        <SelectSetting
          label="Recording Mode"
          value={settings.recordingMode}
          options={RECORDING_MODES}
          labels={recordingModeLabels}
          onChange={(recordingMode) => onUpdateSettings({ recordingMode })}
        />
        <SelectSetting
          label="Language"
          value={settings.language}
          options={SUPPORTED_LANGUAGES}
          labels={languageLabels}
          onChange={(language) => onUpdateSettings({ language })}
        />
      </SettingsCard>
      <SettingsCard group={groups[1]!}>
        <ToggleSetting label="Dictionary Sync" checked={settings.sharedDictionaryEnabled} onChange={(sharedDictionaryEnabled) => onUpdateSettings({ sharedDictionaryEnabled })} />
        <TextSetting label="사용자 정의 경로" value={settings.sharedDictionaryPath ?? ''} placeholder="비워두면 iCloud Drive 사용" onCommit={(sharedDictionaryPath) => onUpdateSettings({ sharedDictionaryPath: sharedDictionaryPath || null })} />
        <ToggleSetting label="Chrome 탭 및 입력 필드 자동 복원" checked={settings.restoreBrowserTab} onChange={(restoreBrowserTab) => onUpdateSettings({ restoreBrowserTab })} />
        <ToggleSetting label="터미널/iTerm2 pane 자동 복원" checked={settings.restoreTerminalContext} onChange={(restoreTerminalContext) => onUpdateSettings({ restoreTerminalContext })} />
      </SettingsCard>
      <SettingsCard group={groups[2]!}>
        <ToggleSetting label="Show transcription overlay" checked={settings.showOverlay} onChange={(showOverlay) => onUpdateSettings({ showOverlay })} />
        <ToggleSetting label="Launch at login" checked={settings.launchAtLogin} onChange={(launchAtLogin) => onUpdateSettings({ launchAtLogin })} />
        <ToggleSetting label="녹음 중 음악 일시정지" checked={settings.pauseMediaDuringRecording} onChange={(pauseMediaDuringRecording) => onUpdateSettings({ pauseMediaDuringRecording })} />
        <ReadonlySetting label="Permissions" value="OS-gated" detail="Microphone, Accessibility, Screen Recording, Automation 권한은 typed OS adapter와 Settings deep-link가 소유합니다." />
      </SettingsCard>
    </div>
  );
}

function STTSettingsPanel({ groups, settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId'>) {
  return (
    <div className="placeholder-grid" data-testid="settings-panel-stt">
      <SettingsCard group={groups[0]!}>
        <SelectSetting label="음성 인식 엔진" value={settings.sttProviderType} options={STT_PROVIDER_TYPES} labels={sttLabels} onChange={(sttProviderType) => onUpdateSettings({ sttProviderType })} />
        <ReadonlySetting label="WhisperKit Large V3 Turbo" value={settings.whisperModelId} detail="로컬 CoreML+ANE, 99개 언어 — macOS native-module adapter seam." />
        <ReadonlySetting label="MLX Audio" value={settings.mlxAudioModelId} detail="mlx-audio, 한중일영 (uv 필요) — macOS stdio sidecar seam." />
      </SettingsCard>
      <SettingsCard group={groups[1]!}>
        <SecretSetting configured={settings.groqApiKeyConfigured} onCommit={(groqApiKey) => onUpdateSettings({ groqApiKey })} />
        <ToggleSetting label="무음 자동 스킵" checked={settings.vadEnabled} onChange={(vadEnabled) => onUpdateSettings({ vadEnabled })} />
        <NumberSetting label="Audio Input Channel" value={settings.audioInputChannel} onCommit={(audioInputChannel) => onUpdateSettings({ audioInputChannel })} />
      </SettingsCard>
    </div>
  );
}

function LLMSettingsPanel({ groups, settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId'>) {
  return (
    <div className="placeholder-grid" data-testid="settings-panel-llm">
      <SettingsCard group={groups[0]!}>
        <ToggleSetting label="Provider enabled" checked={settings.llmEnabled} onChange={(llmEnabled) => onUpdateSettings({ llmEnabled })} />
        <SelectSetting label="Provider" value={settings.llmProviderType} options={LLM_PROVIDER_TYPES} labels={llmLabels} onChange={(llmProviderType) => onUpdateSettings({ llmProviderType })} />
        <ReadonlySetting label="로컬 모델" value={settings.llmModelId} detail="Downloads tab owns local model management." />
      </SettingsCard>
      <SettingsCard group={groups[1]!}>
        <SelectSetting label="OpenAI 모델" value={settings.openaiModel} options={OPENAI_MODELS} onChange={(openaiModel) => onUpdateSettings({ openaiModel: openaiModel as OpenAIModelId })} />
        <SelectSetting label="Groq 모델" value={settings.groqLLMModel} options={GROQ_LLM_MODELS} onChange={(groqLLMModel) => onUpdateSettings({ groqLLMModel })} />
        <ToggleSetting label="스크린샷 컨텍스트" checked={settings.screenshotContextEnabled} onChange={(screenshotContextEnabled) => onUpdateSettings({ screenshotContextEnabled })} />
        <ToggleSetting label="에이전트에 전달" checked={settings.screenshotPasteEnabled} onChange={(screenshotPasteEnabled) => onUpdateSettings({ screenshotPasteEnabled })} />
      </SettingsCard>
      <SettingsCard group={groups[2]!}>
        <SelectSetting label="교정 모드" value={settings.correctionMode} options={CORRECTION_MODES} labels={correctionLabels} onChange={(correctionMode) => onUpdateSettings({ correctionMode })} />
        <TextAreaSetting label="시스템 프롬프트" value={settings.customLLMPrompt ?? ''} onCommit={(customLLMPrompt) => onUpdateSettings({ customLLMPrompt: customLLMPrompt || null })} />
      </SettingsCard>
    </div>
  );
}

function ModelsSettingsPanel({ groups, settings }: Omit<SettingsPanelProps, 'sectionId' | 'onUpdateSettings'>) {
  return (
    <PlaceholderSection groups={groups} extra={(
      <>
        <ReadonlySetting label="WhisperKit 모델" value={settings.whisperModelId} detail="준비됨 상태는 future model manager가 소유합니다." />
        <ReadonlySetting label="LLM 모델" value={settings.llmModelId} detail="Downloads / model cache slice에서 다운로드 상태를 연결합니다." />
        <ReadonlySetting label="MLX Audio 모델" value={settings.mlxAudioModelId} detail="macOS MLX sidecar contract와 readiness probe에 연결됩니다." />
      </>
    )} />
  );
}

function WordSetsPanel({ groups, settings }: Omit<SettingsPanelProps, 'sectionId' | 'onUpdateSettings'>) {
  return (
    <PlaceholderSection groups={groups} extra={(
      <ReadonlySetting
        label="도메인 단어 세트"
        value={`${settings.domainWordSets.length} sets`}
        detail="Quick Fix and dictionary registration slice will edit this through typed IPC."
      />
    )} />
  );
}

export function PlaceholderSection({ groups, extra }: { readonly groups: readonly PlaceholderGroup[]; readonly extra?: ReactNode }) {
  return (
    <div className="placeholder-grid">
      {groups.map((group, index) => (
        <SettingsCard group={group} key={group.title}>
          {index === 0 ? extra : null}
          <ul className="settings-row-list">
            {group.rows.map((row) => (
              <li key={row}>
                <span>{row}</span>
                <small>planned adapter boundary</small>
              </li>
            ))}
          </ul>
        </SettingsCard>
      ))}
    </div>
  );
}

function SettingsCard({ group, children }: { readonly group: PlaceholderGroup; readonly children: ReactNode }) {
  return (
    <section className="liquid-card settings-group" key={group.title}>
      <div className="card-heading">
        <h2>{group.title}</h2>
        <StatusPill tone={implementationTone(group.status)} status={group.status}>{group.status}</StatusPill>
      </div>
      <div className="settings-control-list">{children}</div>
    </section>
  );
}

function ReadonlySetting({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail?: string }) {
  return (
    <div className="settings-control-row">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <output>{value}</output>
    </div>
  );
}

function ToggleSetting({ label, checked, onChange }: { readonly label: string; readonly checked: boolean; readonly onChange: (checked: boolean) => void }) {
  return (
    <label className="settings-control-row">
      <span><strong>{label}</strong></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

function SelectSetting<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly labels?: Partial<Record<T, string>>;
  readonly onChange: (value: T) => void;
}) {
  return (
    <label className="settings-control-row">
      <span><strong>{label}</strong></span>
      <select className="settings-select" value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value as T)}>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function TextSetting({ label, value, placeholder, onCommit }: { readonly label: string; readonly value: string; readonly placeholder?: string; readonly onCommit: (value: string) => void }) {
  return (
    <label className="settings-control-row">
      <span><strong>{label}</strong></span>
      <input className="settings-input" defaultValue={value} placeholder={placeholder} onBlur={(event) => onCommit(event.currentTarget.value)} />
    </label>
  );
}

function NumberSetting({ label, value, onCommit }: { readonly label: string; readonly value: number; readonly onCommit: (value: number) => void }) {
  return (
    <label className="settings-control-row">
      <span><strong>{label}</strong><small>0 = 자동 다운믹스</small></span>
      <input className="settings-input compact" type="number" min={0} defaultValue={value} onBlur={(event) => onCommit(Number(event.currentTarget.value))} />
    </label>
  );
}

function TextAreaSetting({ label, value, onCommit }: { readonly label: string; readonly value: string; readonly onCommit: (value: string) => void }) {
  return (
    <label className="settings-control-column">
      <span><strong>{label}</strong><small>Custom mode에서만 사용될 system prompt.</small></span>
      <textarea className="settings-textarea" defaultValue={value} onBlur={(event) => onCommit(event.currentTarget.value)} />
    </label>
  );
}

function SecretSetting({ configured, onCommit }: { readonly configured: boolean; readonly onCommit: (value: string) => void }) {
  return (
    <label className="settings-control-column">
      <span>
        <strong>API Key</strong>
        <small>{configured ? 'API Key 설정됨 — 값은 renderer snapshot에 노출하지 않음' : 'console.groq.com에서 무료 API Key를 발급받으세요'}</small>
      </span>
      <input className="settings-input" type="password" placeholder={configured ? '새 키 입력 시 교체' : 'gsk_...'} onBlur={(event) => {
        if (event.currentTarget.value) onCommit(event.currentTarget.value);
        event.currentTarget.value = '';
      }} />
    </label>
  );
}
