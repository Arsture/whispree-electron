import { useState, type ChangeEvent, type ReactNode } from 'react';
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
  type WhispreeShortcutSnapshot,
} from '../../shared/settings';
import { implementationTone, type PlaceholderGroup, type SidebarSectionId } from '../ui-model';
import { StatusPill } from '../components/primitives';
import { STTSettingsPanelMock } from './STTSettingsPanelMock';
import { LLMSettingsPanelMock } from './LLMSettingsPanelMock';
import { ModelsPanelMock } from './ModelsPanelMock';
import { DomainWordSetsPanelMock } from './DomainWordSetsPanelMock';

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
  if (sectionId === 'stt') return <STTSettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />;
  if (sectionId === 'llm') return <LLMSettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />;
  if (sectionId === 'models') return <ModelsSettingsPanel />;
  return <WordSetsPanel />;
}

function GeneralSettingsPanel({ groups, settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId'>) {
  return (
    <div className="general-settings-panel settings-parity-scroll" data-testid="settings-panel-general">
      <SettingsCard group={groups[0]!} title="Hotkey" description="Swift GeneralSettingsView의 단축키 카드 구조를 mock recorder로 재현합니다.">
        <ShortcutRecorderSetting
          label="Recording shortcut"
          shortcut={settings.toggleRecordingShortcut}
          kind="toggleRecordingShortcut"
          mockShortcut={{ kind: 'combo', keyCode: 15, modifiersRaw: 655360, label: '⌃⌥⇧R' }}
          onUpdateSettings={onUpdateSettings}
        />
        <ShortcutRecorderSetting
          label="Quick Fix shortcut"
          shortcut={settings.quickFixShortcut}
          kind="quickFixShortcut"
          mockShortcut={{ kind: 'combo', keyCode: 2, modifiersRaw: 655360, label: '⌃⌥⇧D' }}
          onUpdateSettings={onUpdateSettings}
        />
        <p className="settings-help-copy">텍스트를 선택한 후 Quick Fix 단축키를 누르면 단어를 즉시 교정하고 사전에 저장합니다.</p>
      </SettingsCard>

      <SettingsCard group={groups[0]!} title="Recording Mode">
        <RadioSetting
          label="Mode"
          value={settings.recordingMode}
          options={RECORDING_MODES}
          labels={recordingModeLabels}
          onChange={(recordingMode) => onUpdateSettings({ recordingMode })}
        />
        <SettingsDivider />
        <ToggleSetting
          label="녹음 중 음악 일시정지"
          detail="Apple Music, Spotify, YouTube 등 재생 중인 미디어를 녹음 시작 시 자동으로 일시정지하고 종료 시 재개합니다."
          checked={settings.pauseMediaDuringRecording}
          onChange={(pauseMediaDuringRecording) => onUpdateSettings({ pauseMediaDuringRecording })}
        />
      </SettingsCard>

      <SettingsCard group={groups[0]!} title="Audio Input" className="settings-card-muted">
        <SelectSetting
          label="입력 채널:"
          detail="외장 오디오 인터페이스에서 마이크가 연결된 채널을 선택하세요. 다음 녹음부터 적용됩니다."
          value={String(settings.audioInputChannel)}
          options={['0', '1']}
          labels={{ '0': '자동 (모든 채널 다운믹스)', '1': '채널 1' }}
          onChange={(audioInputChannel) => onUpdateSettings({ audioInputChannel: Number(audioInputChannel) })}
        />
      </SettingsCard>

      <SettingsCard group={groups[0]!} title="Language">
        <SelectSetting
          label="Transcription language:"
          value={settings.language}
          options={SUPPORTED_LANGUAGES}
          labels={languageLabels}
          onChange={(language) => onUpdateSettings({ language })}
        />
        {settings.language === 'auto' ? (
          <InlineNotice tone="warning" icon="⚠" text="Auto-detect may not always work correctly. Select a specific language for better accuracy." />
        ) : null}
      </SettingsCard>

      <SettingsCard group={groups[1]!} title="Dictionary Sync">
        <ToggleSetting
          label="사전 동기화"
          checked={settings.sharedDictionaryEnabled}
          onChange={(sharedDictionaryEnabled) => onUpdateSettings({ sharedDictionaryEnabled })}
        />
        <p className="settings-help-copy">Quick Fix 단어와 도메인 단어 세트를 iCloud Drive로 자동 동기화합니다. Dropbox 등 다른 동기화 폴더를 사용하려면 사용자 정의 경로를 지정하세요.</p>
        <TextSetting
          label="사용자 정의 경로"
          value={settings.sharedDictionaryPath ?? ''}
          placeholder="비워두면 iCloud Drive 사용"
          disabled={!settings.sharedDictionaryEnabled}
          onCommit={(sharedDictionaryPath) => onUpdateSettings({ sharedDictionaryPath: sharedDictionaryPath || null })}
        />
        {settings.sharedDictionaryEnabled ? (
          <InlineNotice tone="warning" text={settings.sharedDictionaryPath ? settings.sharedDictionaryPath : 'iCloud Drive를 사용할 수 없습니다. 사용자 정의 경로를 지정하세요.'} />
        ) : null}
        <div className="settings-button-row" aria-label="dictionary sync actions">
          <button type="button" className="settings-mini-button" disabled={!settings.sharedDictionaryEnabled}>지금 가져오기</button>
          <button type="button" className="settings-mini-button" disabled={!settings.sharedDictionaryEnabled}>지금 내보내기</button>
          <small>mock sync controls</small>
        </div>
      </SettingsCard>

      <SettingsCard group={groups[1]!} title="브라우저 복원">
        <ToggleSetting
          label="Chrome 탭 및 입력 필드 자동 복원"
          detail="녹음 시작 전 Chrome 탭과 포커스된 입력 필드를 기억했다가 전사 후 같은 위치로 돌아가 붙여넣습니다."
          checked={settings.restoreBrowserTab}
          onChange={(restoreBrowserTab) => onUpdateSettings({ restoreBrowserTab })}
        />
        {settings.restoreBrowserTab ? (
          <SettingsInset icon="🧭" title="Chrome 입력 필드 복원을 사용하려면 Chrome에서 한 번만 설정해주세요:">
            <ol>
              <li>Chrome 메뉴바 → 보기 → 개발자 → “Apple Events로부터 JavaScript 허용” 체크</li>
              <li>첫 녹음 시 macOS가 “Whispree가 Chrome을 제어” 권한을 요청하면 허용</li>
            </ol>
            <p>설정하지 않으면 탭 복원만 동작하고, 입력 필드 포커스는 복원되지 않습니다.</p>
          </SettingsInset>
        ) : null}
      </SettingsCard>

      <SettingsCard group={groups[1]!} title="터미널 복원">
        <ToggleSetting
          label="iTerm2 pane · tmux 위치 자동 복원"
          detail="녹음 시작 전 iTerm2 session(split)과 tmux window/pane 위치를 기억했다가 전사 후 같은 pane으로 돌아가 붙여넣습니다."
          checked={settings.restoreTerminalContext}
          onChange={(restoreTerminalContext) => onUpdateSettings({ restoreTerminalContext })}
        />
        {settings.restoreTerminalContext ? (
          <SettingsInset icon="🖥️" title="iTerm2 자동화 권한이 필요합니다:">
            <ul>
              <li>첫 녹음 시 macOS가 “Whispree가 iTerm을 제어” 권한을 요청하면 허용</li>
              <li>tmux 사용자는 기본 소켓(`tmux`/`tmux -L default`)에서만 동작. 커스텀 `-L`/`-S` 소켓은 미지원</li>
              <li>Terminal.app, Alacritty, Kitty, Ghostty, Warp 등은 아직 미지원 (앱 포커스만 복원)</li>
            </ul>
          </SettingsInset>
        ) : null}
      </SettingsCard>

      <SettingsCard group={groups[2]!} title="General">
        <ToggleSetting label="Show transcription overlay" checked={settings.showOverlay} onChange={(showOverlay) => onUpdateSettings({ showOverlay })} />
        <ToggleSetting label="Launch at login" checked={settings.launchAtLogin} onChange={(launchAtLogin) => onUpdateSettings({ launchAtLogin })} />
      </SettingsCard>

      <SettingsCard group={groups[2]!} title="Permissions">
        <div className="permission-row-stack">
          <PermissionRow icon="🎙" title="Microphone" subtitle="음성 녹음에 필요합니다" status="notDetermined" />
          <PermissionRow icon="✋" title="Accessibility" subtitle="다른 앱에 텍스트를 붙여넣기 위해 필요합니다" status="denied" />
          <PermissionRow icon="▣" title="화면 녹화" subtitle="다른 앱 화면을 캡처하여 AI 교정의 맥락을 제공합니다" status="granted" />
          <PermissionRow icon="↻" title="App Management" subtitle="자동 업데이트에 필요합니다 (선택)" status="notDetermined" actionLabel="설정 열기" />
        </div>
      </SettingsCard>

      <SettingsCard group={groups[2]!} title="Automation 권한">
        <p className="settings-help-copy settings-help-inset">앱 제어 권한은 해당 기능을 처음 사용할 때 자동으로 요청됩니다.</p>
        <div className="permission-row-stack">
          <PermissionRow icon="♪" title="Apple Music" subtitle="녹음 중 음악 자동 일시정지" status="notDetermined" />
          <PermissionRow icon="♬" title="Spotify" subtitle="녹음 중 음악 자동 일시정지" status="unavailable" />
          <PermissionRow icon="◎" title="Google Chrome" subtitle="탭 복원 및 입력 필드 포커스" status="denied" />
          <PermissionRow icon=">_" title="iTerm2" subtitle="터미널 pane 위치 복원" status="notDetermined" />
        </div>
      </SettingsCard>
    </div>
  );
}

function STTSettingsPanel({ settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId' | 'groups'>) {
  return (
    <div className="settings-integrated-mock" data-testid="settings-panel-stt">
      <STTSettingsPanelMock />
      <div className="settings-ipc-bridge" aria-label="STT typed settings bridge">
        <SelectSetting
          label="음성 인식 엔진"
          value={settings.sttProviderType}
          options={STT_PROVIDER_TYPES}
          labels={sttLabels}
          onChange={(sttProviderType) => onUpdateSettings({ sttProviderType })}
        />
        <SecretSetting configured={settings.groqApiKeyConfigured} onCommit={(groqApiKey) => onUpdateSettings({ groqApiKey })} />
        <ToggleSetting label="무음 자동 스킵" checked={settings.vadEnabled} onChange={(vadEnabled) => onUpdateSettings({ vadEnabled })} />
        <NumberSetting label="Audio Input Channel" value={settings.audioInputChannel} onCommit={(audioInputChannel) => onUpdateSettings({ audioInputChannel })} />
      </div>
    </div>
  );
}

function LLMSettingsPanel({ settings, onUpdateSettings }: Omit<SettingsPanelProps, 'sectionId' | 'groups'>) {
  return (
    <div className="settings-integrated-mock" data-testid="settings-panel-llm">
      <LLMSettingsPanelMock />
      <div className="settings-ipc-bridge" aria-label="LLM typed settings bridge">
        <SelectSetting label="Provider" value={settings.llmProviderType} options={LLM_PROVIDER_TYPES} labels={llmLabels} onChange={(llmProviderType) => onUpdateSettings({ llmProviderType })} />
        <SelectSetting label="OpenAI 모델" value={settings.openaiModel} options={OPENAI_MODELS} onChange={(openaiModel) => onUpdateSettings({ openaiModel: openaiModel as OpenAIModelId })} />
        <SelectSetting label="Groq 모델" value={settings.groqLLMModel} options={GROQ_LLM_MODELS} onChange={(groqLLMModel) => onUpdateSettings({ groqLLMModel })} />
        <ToggleSetting label="스크린샷 컨텍스트" checked={settings.screenshotContextEnabled} onChange={(screenshotContextEnabled) => onUpdateSettings({ screenshotContextEnabled })} />
        <ToggleSetting label="에이전트에 전달" checked={settings.screenshotPasteEnabled} onChange={(screenshotPasteEnabled) => onUpdateSettings({ screenshotPasteEnabled })} />
        <SelectSetting label="교정 모드" value={settings.correctionMode} options={CORRECTION_MODES} labels={correctionLabels} onChange={(correctionMode) => onUpdateSettings({ correctionMode })} />
        <TextAreaSetting label="시스템 프롬프트" value={settings.customLLMPrompt ?? ''} onCommit={(customLLMPrompt) => onUpdateSettings({ customLLMPrompt: customLLMPrompt || null })} />
      </div>
    </div>
  );
}

function ModelsSettingsPanel() {
  return <ModelsPanelMock />;
}

function WordSetsPanel() {
  return <DomainWordSetsPanelMock />;
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

function SettingsCard({
  group,
  title,
  description,
  className,
  children,
}: {
  readonly group: PlaceholderGroup;
  readonly title?: string;
  readonly description?: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={`liquid-card settings-group settings-card-parity${className ? ` ${className}` : ''}`} key={title ?? group.title}>
      <div className="card-heading settings-card-heading-parity">
        <div>
          <h2>{title ?? group.title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <StatusPill tone={implementationTone(group.status)} status={group.status}>{group.status}</StatusPill>
      </div>
      <div className="settings-control-list">{children}</div>
    </section>
  );
}

function ToggleSetting({ label, detail, checked, onChange }: { readonly label: string; readonly detail?: string; readonly checked: boolean; readonly onChange: (checked: boolean) => void }) {
  return (
    <label className="settings-control-row settings-row-parity">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <input className="settings-switch" type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

function SelectSetting<T extends string>({
  label,
  detail,
  value,
  options,
  labels,
  onChange,
}: {
  readonly label: string;
  readonly detail?: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly labels?: Partial<Record<T, string>>;
  readonly onChange: (value: T) => void;
}) {
  return (
    <label className="settings-control-row">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <select className="settings-select" value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value as T)}>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function TextSetting({ label, value, placeholder, disabled = false, onCommit }: { readonly label: string; readonly value: string; readonly placeholder?: string; readonly disabled?: boolean; readonly onCommit: (value: string) => void }) {
  return (
    <label className="settings-control-column" aria-disabled={disabled}>
      <span><strong>{label}</strong></span>
      <input className="settings-input" defaultValue={value} placeholder={placeholder} disabled={disabled} onBlur={(event) => onCommit(event.currentTarget.value)} />
    </label>
  );
}


type ShortcutSettingKey = 'toggleRecordingShortcut' | 'quickFixShortcut';
type MockPermissionStatus = 'granted' | 'denied' | 'notDetermined' | 'unavailable';

function ShortcutRecorderSetting({
  label,
  shortcut,
  kind,
  mockShortcut,
  onUpdateSettings,
}: {
  readonly label: string;
  readonly shortcut: WhispreeShortcutSnapshot;
  readonly kind: ShortcutSettingKey;
  readonly mockShortcut: WhispreeShortcutSnapshot;
  readonly onUpdateSettings: (update: AppSettingsUpdate) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const updateShortcut = (nextShortcut: WhispreeShortcutSnapshot) => {
    void onUpdateSettings({ [kind]: nextShortcut });
    setIsOpen(false);
    setShowConflict(false);
  };

  return (
    <div className="settings-control-row settings-shortcut-row">
      <span><strong>{label}</strong></span>
      <div className="shortcut-recorder-anchor">
        <button type="button" className="shortcut-badge" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          {shortcut.label}
        </button>
        {isOpen ? (
          <div className="shortcut-popover" role="dialog" aria-label={`${label} recorder mock`}>
            {showConflict ? (
              <div className="shortcut-popover-content">
                <div className="shortcut-conflict-title"><span aria-hidden="true">⚠</span><strong>{mockShortcut.label}</strong></div>
                <p>macOS의 “Spotlight” 기능을 override합니다. 다른 단축키로 변경 시 자동 복구됩니다.</p>
                <div className="shortcut-popover-actions">
                  <button type="button" className="settings-mini-button" onClick={() => setShowConflict(false)}>다시 입력</button>
                  <button type="button" className="settings-mini-button primary" onClick={() => updateShortcut(mockShortcut)}>사용하기</button>
                </div>
              </div>
            ) : (
              <div className="shortcut-popover-content">
                <div className="shortcut-recording-dot" aria-hidden="true"><span /></div>
                <h3>새 단축키를 입력하세요</h3>
                <strong className="shortcut-live-keys">⌃⌥⇧</strong>
                <p>modifier 하나만 누르고 떼면 단독 키 바인딩 (예: R⌥)</p>
                <div className="shortcut-popover-actions">
                  <button type="button" className="settings-mini-button" onClick={() => updateShortcut(kind === 'toggleRecordingShortcut' ? { kind: 'combo', keyCode: 15, modifiersRaw: 393216, label: '⌃⇧R' } : { kind: 'combo', keyCode: 2, modifiersRaw: 393216, label: '⌃⇧D' })}>기본값</button>
                  <button type="button" className="settings-mini-button" onClick={() => setIsOpen(false)}>취소</button>
                  <button type="button" className="settings-mini-button primary" onClick={() => setShowConflict(true)}>Mock capture</button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RadioSetting<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly labels: Record<T, string>;
  readonly onChange: (value: T) => void;
}) {
  return (
    <fieldset className="settings-radio-group">
      <legend>{label}</legend>
      {options.map((option) => (
        <label className="settings-radio-option" key={option}>
          <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} />
          <span>{labels[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}

function SettingsDivider() {
  return <div className="settings-divider" role="separator" />;
}

function InlineNotice({ tone = 'neutral', icon, text }: { readonly tone?: 'warning' | 'neutral'; readonly icon?: string; readonly text: string }) {
  return <p className="settings-inline-notice" data-tone={tone}>{icon ? <span aria-hidden="true">{icon}</span> : null}{text}</p>;
}

function SettingsInset({ icon, title, children }: { readonly icon: string; readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="settings-inset-note">
      <div className="settings-inset-title"><span aria-hidden="true">{icon}</span><strong>{title}</strong></div>
      {children}
    </div>
  );
}

function PermissionRow({
  icon,
  title,
  subtitle,
  status,
  actionLabel,
}: {
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly status: MockPermissionStatus;
  readonly actionLabel?: string;
}) {
  const computedActionLabel = actionLabel ?? (status === 'denied' ? '설정 열기' : '허용하기');
  return (
    <div className="permission-row-mock">
      <span className="permission-icon" aria-hidden="true">{icon}</span>
      <span className="permission-copy"><strong>{title}</strong><small>{subtitle}</small></span>
      {status === 'granted' ? <span className="permission-check" aria-label="granted">✓</span> : null}
      {status === 'unavailable' ? <span className="permission-unavailable">미설치</span> : null}
      {status === 'denied' || status === 'notDetermined' ? <button type="button" className="permission-action">{computedActionLabel}</button> : null}
    </div>
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
