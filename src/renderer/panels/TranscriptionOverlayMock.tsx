import type { CSSProperties } from 'react';

import '../styles/overlay.css';

type OverlayTone = 'idle' | 'recording' | 'handoff' | 'muted' | 'loading' | 'success' | 'error';

type HotkeyChip = {
  readonly label: string;
  readonly keys: string;
  readonly active?: boolean;
};

type OverlayMockState = {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly status: string;
  readonly tone: OverlayTone;
  readonly waveform: 'live' | 'dimmed' | 'quiet';
  readonly loading?: boolean;
  readonly hotkeys: readonly HotkeyChip[];
  readonly hint?: string;
};

const waveformLevels = [
  0.18, 0.22, 0.26, 0.2, 0.34, 0.3, 0.42, 0.38,
  0.48, 0.56, 0.45, 0.62, 0.7, 0.52, 0.76, 0.88,
  0.68, 0.92, 0.8, 0.96, 0.72, 0.84, 0.94, 1,
  0.98, 0.9, 0.82, 0.74, 0.95, 0.78, 0.9, 0.66,
  0.54, 0.72, 0.58, 0.46, 0.6, 0.5, 0.4, 0.44,
  0.32, 0.36, 0.28, 0.24, 0.31, 0.22, 0.26, 0.18,
] as const;

const overlayStates: readonly OverlayMockState[] = [
  {
    id: 'recording',
    title: 'Recording overlay',
    icon: '●',
    status: 'Recording · 2 pending',
    tone: 'recording',
    waveform: 'live',
    hotkeys: [
      { label: 'Stop', keys: '⌘⇧Space' },
      { label: 'Cancel', keys: 'esc' },
      { label: 'Img Attach', keys: '⌥', active: true },
    ],
  },
  {
    id: 'handoff-flash',
    title: 'Handoff flash',
    icon: '▧',
    status: 'Img Attach ON',
    tone: 'handoff',
    waveform: 'live',
    hotkeys: [
      { label: 'Stop', keys: '⌘⇧Space' },
      { label: 'Cancel', keys: 'esc' },
      { label: 'Img Attach', keys: '⌥', active: true },
    ],
    hint: 'photo.fill.on.rectangle.fill flash mock',
  },
  {
    id: 'thinking-pause',
    title: 'Thinking pause',
    icon: '⌁',
    status: '무음 스킵 중',
    tone: 'muted',
    waveform: 'quiet',
    hotkeys: [
      { label: 'Stop', keys: '⌘⇧Space' },
      { label: 'Cancel', keys: 'esc' },
      { label: 'Img Attach', keys: '⌥' },
    ],
  },
  {
    id: 'loading',
    title: 'Foreground loading',
    icon: '☰',
    status: 'Correcting',
    tone: 'loading',
    waveform: 'dimmed',
    loading: true,
    hotkeys: [{ label: 'Cancel #3', keys: 'esc' }],
    hint: 'transcribing/correcting cancelable queue item',
  },
  {
    id: 'error',
    title: 'Error surface',
    icon: '!',
    status: '전사 실패 · 다시 시도',
    tone: 'error',
    waveform: 'dimmed',
    hotkeys: [{ label: 'Cancel #4', keys: 'esc' }],
    hint: 'mocked error state for handoff/insert failure review',
  },
];

function NeonWaveformMock({ mode }: { readonly mode: OverlayMockState['waveform'] }) {
  return (
    <div className="transcription-neon-waveform" data-mode={mode} aria-label="NeonWaveform central-fold bar pattern">
      <div className="transcription-waveform-bars" aria-hidden="true">
        {waveformLevels.map((level, index) => {
          const center = (waveformLevels.length - 1) / 2;
          const distance = Math.abs(index - center) / center;
          return (
            <span
              className="transcription-waveform-bar"
              data-edge={distance > 0.66 ? 'true' : 'false'}
              key={`${index}-${level}`}
              style={{ '--bar-level': level, '--bar-distance': distance } as CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}

function HotkeyBadge({ chip }: { readonly chip: HotkeyChip }) {
  return (
    <span className="transcription-hotkey-badge" data-active={chip.active === true}>
      <span className="transcription-hotkey-label">{chip.label}</span>
      <kbd>{chip.keys}</kbd>
    </span>
  );
}

function OverlayCard({ state }: { readonly state: OverlayMockState }) {
  return (
    <section className="transcription-overlay-card" data-state={state.id} data-tone={state.tone} aria-label={state.title}>
      <div className="transcription-overlay-status-row">
        <span className="transcription-overlay-icon" aria-hidden="true">{state.icon}</span>
        <strong>{state.status}</strong>
        <span className="transcription-overlay-spacer" />
        {state.loading ? <span className="transcription-overlay-spinner" aria-label="Loading" /> : null}
      </div>

      <NeonWaveformMock mode={state.waveform} />

      <div className="transcription-hotkey-row" aria-label={`${state.title} hotkeys`}>
        {state.hotkeys.map((chip) => <HotkeyBadge chip={chip} key={`${state.id}-${chip.label}-${chip.keys}`} />)}
      </div>

      {state.hint ? <p className="transcription-overlay-hint">{state.hint}</p> : null}
    </section>
  );
}

export function TranscriptionOverlayMock() {
  return (
    <div className="transcription-overlay-mock" data-testid="transcription-overlay-mock">
      <header className="transcription-overlay-mock-header">
        <div>
          <p>Transcription Overlay</p>
          <h1>전사 오버레이 UI mock</h1>
        </div>
        <span>280px regularMaterial · UI only</span>
      </header>

      <div className="transcription-overlay-showcase">
        {overlayStates.map((state) => <OverlayCard state={state} key={state.id} />)}
      </div>
    </div>
  );
}

export default TranscriptionOverlayMock;
