import type { CSSProperties, ReactNode } from 'react';

import '../../styles/menubar.css';

export type RecordingMode = 'push-to-talk' | 'toggle' | 'quick';
export type MenuBarTone = 'idle' | 'recording' | 'transcribing' | 'correcting' | 'inserting';

export type MenuBarState = {
  readonly modelReady: boolean;
  readonly tone: MenuBarTone;
  readonly statusText: string;
  readonly audioLevel: number;
  readonly queuedCount: number;
  readonly lastTranscription: string;
  readonly llmCorrection: boolean;
  readonly recordingMode: RecordingMode;
};

const modeLabels: Record<RecordingMode, string> = {
  'push-to-talk': 'Push',
  toggle: 'Toggle',
  quick: 'Quick',
};

const mockState: MenuBarState = {
  modelReady: true,
  tone: 'recording',
  statusText: 'Recording · 2 queued',
  audioLevel: 0.68,
  queuedCount: 2,
  lastTranscription: '오늘 회의 노트 정리하고 Electron 마이그레이션 UI parity 체크리스트를 업데이트해줘.',
  llmCorrection: true,
  recordingMode: 'toggle',
};

function StatusBadge({ ready }: { readonly ready: boolean }) {
  return (
    <span className="menubar-status-badge" data-ready={ready} aria-label={ready ? 'Model ready' : 'Model warning'}>
      {ready ? '✓' : '!'}
    </span>
  );
}

function SectionCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="menubar-section-card">
      <p className="menubar-section-title">{title}</p>
      {children}
    </section>
  );
}

function AudioLevelBar({ level }: { readonly level: number }) {
  const clamped = Math.max(0, Math.min(level, 1));
  return (
    <div className="menubar-audio-track" aria-label={`Audio level ${Math.round(clamped * 100)}%`}>
      <span className="menubar-audio-fill" style={{ '--menubar-audio-level': clamped } as CSSProperties} />
    </div>
  );
}

function ToggleMock({ checked, label }: { readonly checked: boolean; readonly label: string }) {
  return (
    <div className="menubar-toggle-row">
      <span>{label}</span>
      <span className="menubar-switch" data-checked={checked} aria-hidden="true">
        <span />
      </span>
    </div>
  );
}

function ModePicker({ selected }: { readonly selected: RecordingMode }) {
  return (
    <div className="menubar-mode-picker" aria-label="Recording mode segmented picker">
      {(Object.keys(modeLabels) as RecordingMode[]).map((mode) => (
        <span className="menubar-mode-segment" data-selected={selected === mode} key={mode}>
          {modeLabels[mode]}
        </span>
      ))}
    </div>
  );
}

export function MenuBarMock({ state = mockState }: { readonly state?: MenuBarState }) {
  return (
    <div className="menubar-popover-mock" data-testid="menubar-popover-mock" aria-label="Whispree menu bar popover mock">
      <header className="menubar-header">
        <span className="menubar-waveform-icon" aria-hidden="true">≋</span>
        <strong>Whispree</strong>
        <span className="menubar-spacer" />
        <StatusBadge ready={state.modelReady} />
      </header>

      <SectionCard title="Status">
        <div className="menubar-status-row" data-tone={state.tone}>
          <span className="menubar-status-dot" aria-hidden="true" />
          <span>{state.statusText}</span>
        </div>
        {state.tone === 'recording' ? <AudioLevelBar level={state.audioLevel} /> : null}
        <p className="menubar-fifo-note">{state.queuedCount} queued · FIFO insert preserved</p>
      </SectionCard>

      <SectionCard title="Last transcription">
        <p className="menubar-last-transcription">{state.lastTranscription}</p>
      </SectionCard>

      <SectionCard title="Controls">
        <ToggleMock checked={state.llmCorrection} label="LLM Correction" />
        <ModePicker selected={state.recordingMode} />
      </SectionCard>

      <footer className="menubar-actions">
        <button className="menubar-action-button" type="button">Settings...</button>
        <button className="menubar-action-button menubar-action-quit" type="button">Quit</button>
      </footer>
    </div>
  );
}

export default MenuBarMock;
