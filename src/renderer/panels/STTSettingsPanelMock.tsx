import type { ReactNode } from 'react';

import '../styles/settings-stt.css';

type ProviderTone = 'accent' | 'neutral' | 'warning' | 'success';
type ProviderState = 'ready' | 'loading' | 'download-required' | 'queued';
type CompatibilityGrade = 'Runs Great' | 'Good' | 'Cloud' | 'Experimental';

interface MetricModel {
  readonly icon: string;
  readonly label: string;
  readonly tone?: ProviderTone;
}

interface ProviderModel {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly grade: CompatibilityGrade;
  readonly state: ProviderState;
  readonly selected: boolean;
  readonly metrics: readonly MetricModel[];
  readonly stateCopy: string;
}

const providers: readonly ProviderModel[] = [
  {
    id: 'whisperkit',
    title: 'WhisperKit',
    description: '로컬 CoreML+ANE, 99개 언어',
    grade: 'Good',
    state: 'ready',
    selected: true,
    metrics: [
      { icon: '◼', label: '~1.5 GB' },
      { icon: '▣', label: 'RAM 18%' },
      { icon: '▥', label: 'Quality 75' },
    ],
    stateCopy: 'Ready — 로컬 모델이 준비되어 있습니다.',
  },
  {
    id: 'groq',
    title: 'Groq Cloud API',
    description: '클라우드 STT, API Key 필요',
    grade: 'Cloud',
    state: 'ready',
    selected: false,
    metrics: [
      { icon: '☁', label: 'Cloud' },
      { icon: '⌁', label: '200ms' },
      { icon: '▥', label: 'Quality 95', tone: 'success' },
    ],
    stateCopy: 'Ready — 네트워크와 API Key가 필요합니다.',
  },
  {
    id: 'mlx-audio',
    title: 'MLX Audio',
    description: 'mlx-audio, 한중일영 (uv 필요)',
    grade: 'Runs Great',
    state: 'loading',
    selected: false,
    metrics: [
      { icon: '◼', label: '~1.0 GB' },
      { icon: '▣', label: 'RAM 12%' },
      { icon: '▥', label: 'Quality 65' },
    ],
    stateCopy: 'Loading... 첫 실행 준비 중입니다.',
  },
  {
    id: 'local-sidecar',
    title: 'Local Sidecar',
    description: 'OS 로컬 STT adapter seam, UI mock only',
    grade: 'Experimental',
    state: 'download-required',
    selected: false,
    metrics: [
      { icon: '◼', label: 'varies' },
      { icon: '▣', label: 'RAM n/a', tone: 'neutral' },
      { icon: '▥', label: 'Quality TBD', tone: 'warning' },
    ],
    stateCopy: '다운로드 필요 — Downloads 탭에서 모델을 준비하세요.',
  },
];

const channelOptions = [
  { value: '0', label: '0 — 자동 다운믹스', selected: true },
  { value: '1', label: '1 — 왼쪽/모노 입력', selected: false },
  { value: '2', label: '2 — 오른쪽 채널', selected: false },
] as const;

function gradeTone(grade: CompatibilityGrade): ProviderTone {
  if (grade === 'Runs Great' || grade === 'Cloud') return 'success';
  if (grade === 'Experimental') return 'warning';
  return 'neutral';
}

function stateTone(state: ProviderState): ProviderTone {
  if (state === 'ready') return 'success';
  if (state === 'download-required') return 'warning';
  if (state === 'loading') return 'accent';
  return 'neutral';
}

function stateIcon(state: ProviderState): string {
  if (state === 'ready') return '✓';
  if (state === 'download-required') return '↓';
  if (state === 'loading') return '◌';
  return '⋯';
}

function ProviderMetrics({ metrics, grade }: { readonly metrics: readonly MetricModel[]; readonly grade: CompatibilityGrade }) {
  return (
    <div className="stt-metrics" aria-label="model metrics">
      <span className="stt-compatibility-badge" data-tone={gradeTone(grade)}>{grade}</span>
      <div className="stt-metric-list">
        {metrics.map((metric) => (
          <span className="stt-metric-label" data-tone={metric.tone ?? 'neutral'} key={`${metric.icon}-${metric.label}`}>
            <span aria-hidden="true">{metric.icon}</span>
            {metric.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProviderRow({ provider }: { readonly provider: ProviderModel }) {
  return (
    <div
      className="stt-provider-row"
      data-provider={provider.id}
      data-selected={provider.selected}
      role="radio"
      aria-checked={provider.selected}
      tabIndex={0}
    >
      <div className="stt-provider-main">
        <span className="stt-radio-mark" aria-hidden="true">{provider.selected ? '✓' : ''}</span>
        <span className="stt-provider-copy">
          <strong>{provider.title}</strong>
          <small>{provider.description}</small>
        </span>
        <ProviderMetrics metrics={provider.metrics} grade={provider.grade} />
      </div>
      {(provider.selected || provider.state !== 'ready') ? (
        <div className="stt-provider-state" data-tone={stateTone(provider.state)}>
          <span aria-hidden="true">{stateIcon(provider.state)}</span>
          <span>{provider.stateCopy}</span>
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, eyebrow, children }: { readonly title: string; readonly eyebrow?: string; readonly children: ReactNode }) {
  return (
    <section className="stt-liquid-card">
      <div className="stt-card-heading">
        <h2>{title}</h2>
        {eyebrow ? <span>{eyebrow}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function STTSettingsPanelMock() {
  return (
    <div className="stt-settings-mock" data-testid="stt-settings-panel-mock">
      <header className="stt-panel-header">
        <div>
          <p>Speech to Text</p>
          <h1>음성 인식 설정</h1>
        </div>
        <span className="stt-header-status">UI parity mock · no backend</span>
      </header>

      <SectionCard title="음성 인식 엔진" eyebrow="radio rows">
        <div className="stt-provider-list" role="radiogroup" aria-label="STT provider mock selector">
          {providers.map((provider) => <ProviderRow provider={provider} key={provider.id} />)}
        </div>
      </SectionCard>

      <SectionCard title="API Key" eyebrow="Groq Cloud">
        <div className="stt-api-notice" data-tone="warning">
          <span aria-hidden="true">ⓘ</span>
          <div>
            <strong>console.groq.com에서 무료 API Key를 발급받으세요</strong>
            <p>이 mock은 키 입력이나 저장을 수행하지 않습니다. 실제 값은 renderer snapshot에 노출하지 않는 흐름으로 연결됩니다.</p>
          </div>
        </div>
      </SectionCard>

      <div className="stt-status-grid">
        <SectionCard title="Model Status" eyebrow="selected">
          <div className="stt-status-block" data-tone="success">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>WhisperKit Ready</strong>
              <p>로컬 CoreML+ANE 모델이 준비된 상태로 표시됩니다.</p>
            </div>
          </div>
          <div className="stt-status-block" data-tone="warning">
            <span aria-hidden="true">↓</span>
            <div>
              <strong>다운로드 필요</strong>
              <p>로컬 sidecar 모델은 Downloads 탭에서 다운로드하는 Swift notice를 보존합니다.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Cold Start" eyebrow="MLX">
          <div className="stt-status-block" data-tone="accent">
            <span className="stt-spinner" aria-hidden="true" />
            <div>
              <strong>콜드 스타트 중...</strong>
              <p>첫 실행 시 약 1분 소요됩니다.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="무음 자동 스킵" eyebrow="VAD">
        <div className="stt-vad-block">
          <div>
            <strong>활성화</strong>
            <p>끄면 pause 인디케이터와 무음 후처리를 함께 비활성화합니다.</p>
          </div>
          <span className="stt-switch" data-on="true" aria-label="VAD enabled" role="switch" aria-checked="true" />
        </div>
        <div className="stt-inline-note" data-tone="warning">
          <span aria-hidden="true">≋</span>
          현재 ON — 긴 무음만 잘라서 전사하고, 녹음 중 pause 인디케이터를 표시합니다.
        </div>
      </SectionCard>

      <SectionCard title="Audio Input Channel" eyebrow="mock">
        <div className="stt-channel-grid" role="radiogroup" aria-label="Audio input channel mock">
          {channelOptions.map((option) => (
            <div className="stt-channel-option" data-selected={option.selected} role="radio" aria-checked={option.selected} key={option.value}>
              <span>{option.value}</span>
              <strong>{option.label}</strong>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default STTSettingsPanelMock;
