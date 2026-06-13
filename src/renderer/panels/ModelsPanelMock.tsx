import type { ReactNode } from 'react';

import '../styles/models.css';

type CompatibilityGrade = 'RUNS GREAT' | 'RUNS WELL' | 'DECENT' | 'TIGHT FIT' | 'BARELY RUNS' | 'TOO HEAVY';
type ModelState = 'not-downloaded' | 'queued' | 'downloading' | 'loading' | 'ready' | 'error';
type ModelFamily = 'stt' | 'llm';
type Tone = 'neutral' | 'warning' | 'danger' | 'success' | 'accent';

interface MetricItem {
  readonly icon: string;
  readonly label: string;
  readonly tone?: Tone;
}

interface DownloadableModel {
  readonly id: string;
  readonly family: ModelFamily;
  readonly name: string;
  readonly description: string;
  readonly grade: CompatibilityGrade;
  readonly state: ModelState;
  readonly selected?: boolean;
  readonly supportsVision?: boolean;
  readonly progress?: number;
  readonly downloadedText?: string;
  readonly totalText?: string;
  readonly errorText?: string;
  readonly metrics: readonly MetricItem[];
}

const devicePills = [
  { icon: 'cpu', label: 'Apple M3 Pro' },
  { icon: 'memorychip', label: '36 GB' },
  { icon: 'arrow.left.arrow.right', label: '~150 GB/s' },
  { icon: 'gpu', label: '18 cores' },
] as const;

const deviceCards = [
  { label: '실행 여유', value: 'STT + LLM 동시 가능', detail: 'Swift DeviceCapability.current 기반 mock', tone: 'success' },
  { label: '메모리 압박', value: '보통', detail: '대형 모델 2개 이상은 TIGHT FIT로 표시', tone: 'neutral' },
  { label: '권장 조합', value: 'WhisperKit + Qwen 4B', detail: '로컬 CoreML/MLX 워크플로우', tone: 'accent' },
] as const satisfies readonly { readonly label: string; readonly value: string; readonly detail: string; readonly tone: Tone }[];

const sttModels: readonly DownloadableModel[] = [
  {
    id: 'whisperkit-large-v3-turbo',
    family: 'stt',
    name: 'WhisperKit Large V3 Turbo',
    description: '로컬 CoreML+ANE, 99개 언어',
    grade: 'RUNS WELL',
    state: 'ready',
    selected: true,
    metrics: [
      { icon: 'internaldrive', label: '~1.5 GB' },
      { icon: 'memorychip', label: 'RAM 18%' },
      { icon: 'chart.bar', label: 'Quality 75' },
    ],
  },
  {
    id: 'qwen3-asr-1-7b',
    family: 'stt',
    name: 'Qwen3-ASR-1.7B-8bit',
    description: 'mlx-audio, 한중일영 (uv 필요)',
    grade: 'RUNS GREAT',
    state: 'loading',
    metrics: [
      { icon: 'internaldrive', label: '~1.0 GB' },
      { icon: 'memorychip', label: 'RAM 12%' },
      { icon: 'chart.bar', label: 'Quality 65' },
    ],
  },
];

const llmModels: readonly DownloadableModel[] = [
  {
    id: 'qwen3-4b-mlx',
    family: 'llm',
    name: 'Qwen3 4B MLX 4-bit',
    description: '빠른 로컬 교정, 한국어/영어 균형',
    grade: 'RUNS GREAT',
    state: 'downloading',
    progress: 0.37,
    downloadedText: '1.6 GB',
    totalText: '4.3 GB',
    metrics: [
      { icon: 'internaldrive', label: '~4.3 GB' },
      { icon: 'memorychip', label: 'RAM 38%' },
      { icon: 'bolt', label: '42 tok/s' },
      { icon: 'chart.bar', label: 'Quality 72' },
    ],
  },
  {
    id: 'gemma-3-4b-vision',
    family: 'llm',
    name: 'Gemma 3 4B Vision MLX',
    description: '스크린샷 컨텍스트용 vision capability',
    grade: 'DECENT',
    state: 'not-downloaded',
    supportsVision: true,
    metrics: [
      { icon: 'internaldrive', label: '~5.1 GB' },
      { icon: 'memorychip', label: 'RAM 47%' },
      { icon: 'bolt', label: '28 tok/s' },
      { icon: 'chart.bar', label: 'Quality 78' },
    ],
  },
  {
    id: 'qwen3-14b-mlx',
    family: 'llm',
    name: 'Qwen3 14B MLX 4-bit',
    description: '높은 품질, STT 모델과 동시 사용 시 메모리 주의',
    grade: 'TIGHT FIT',
    state: 'queued',
    totalText: '9.8 GB',
    metrics: [
      { icon: 'internaldrive', label: '~9.8 GB' },
      { icon: 'memorychip', label: 'RAM 82%', tone: 'warning' },
      { icon: 'bolt', label: '15 tok/s' },
      { icon: 'chart.bar', label: 'Quality 88' },
    ],
  },
  {
    id: 'llama-3-70b-heavy',
    family: 'llm',
    name: 'Llama 3.3 70B Preview',
    description: '로컬 장치에는 너무 무거운 future catalog entry',
    grade: 'TOO HEAVY',
    state: 'error',
    errorText: '디스크 공간 부족 — 42 GB 필요',
    metrics: [
      { icon: 'internaldrive', label: '~42 GB' },
      { icon: 'memorychip', label: 'RAM 145%', tone: 'danger' },
      { icon: 'bolt', label: 'n/a', tone: 'warning' },
      { icon: 'chart.bar', label: 'Quality 95' },
    ],
  },
];

function gradeTone(grade: CompatibilityGrade): Tone {
  if (grade === 'TIGHT FIT') return 'warning';
  if (grade === 'BARELY RUNS' || grade === 'TOO HEAVY') return 'danger';
  return 'neutral';
}


function stateSummary(state: ModelState): string {
  switch (state) {
    case 'ready':
      return '준비됨';
    case 'queued':
      return '다운로드 대기 중...';
    case 'downloading':
      return '다운로드 중...';
    case 'loading':
      return '로딩 중...';
    case 'error':
      return '오류';
    case 'not-downloaded':
      return '다운로드 필요';
  }
}

function progressLabel(model: DownloadableModel): string {
  const progress = model.progress ?? 0;
  const percent = progress < 0.01 ? `${(progress * 100).toFixed(1)}%` : `${Math.trunc(progress * 100)}%`;
  if (model.downloadedText && model.totalText) return `${model.downloadedText} / ${model.totalText} (${percent}) 다운로드 중...`;
  return `${percent} 다운로드 중...`;
}

function SectionCard({ title, children, eyebrow }: { readonly title: string; readonly children: ReactNode; readonly eyebrow?: string }) {
  return (
    <section className="models-section">
      <h2>{title}</h2>
      <div className="models-liquid-card">
        {eyebrow ? <span className="models-section-eyebrow">{eyebrow}</span> : null}
        {children}
      </div>
    </section>
  );
}

function CompatibilityBadge({ grade }: { readonly grade: CompatibilityGrade }) {
  return <span className="models-compatibility-badge" data-tone={gradeTone(grade)}>{grade}</span>;
}

function ModelMetrics({ model }: { readonly model: DownloadableModel }) {
  return (
    <div className="models-metrics" aria-label={`${model.name} metrics`}>
      <CompatibilityBadge grade={model.grade} />
      <div className="models-metric-list">
        {model.metrics.map((metric) => (
          <span className="models-metric-label" data-tone={metric.tone ?? 'neutral'} key={`${model.id}-${metric.icon}-${metric.label}`}>
            <span aria-hidden="true">{metric.icon}</span>
            {metric.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StateControls({ model }: { readonly model: DownloadableModel }) {
  if (model.state === 'not-downloaded') {
    return <button className="models-primary-button" type="button">다운로드</button>;
  }

  if (model.state === 'queued') {
    return (
      <div className="models-state-line" data-tone="neutral">
        <span className="models-spinner" aria-hidden="true" />
        <span>{stateSummary(model.state)}</span>
        <button className="models-ghost-button" type="button">취소</button>
      </div>
    );
  }

  if (model.state === 'downloading') {
    return (
      <div className="models-download-progress">
        <div className="models-progress-track" aria-hidden="true">
          <span style={{ inlineSize: `${Math.round((model.progress ?? 0) * 100)}%` }} />
        </div>
        <div className="models-state-line" data-tone="accent">
          <span>{progressLabel(model)}</span>
          <button className="models-ghost-button" type="button">취소</button>
        </div>
      </div>
    );
  }

  if (model.state === 'loading') {
    return (
      <div className="models-state-line" data-tone="accent">
        <span className="models-spinner" aria-hidden="true" />
        <span>{stateSummary(model.state)}</span>
        <button className="models-ghost-button" type="button">취소</button>
      </div>
    );
  }

  if (model.state === 'error') {
    return (
      <div className="models-state-line" data-tone="danger">
        <span aria-hidden="true">exclamationmark.triangle.fill</span>
        <span>{model.errorText ?? '다운로드 실패'}</span>
        <button className="models-ghost-button" type="button">재시도</button>
      </div>
    );
  }

  return (
    <div className="models-state-line" data-tone="success">
      <span aria-hidden="true">checkmark.circle.fill</span>
      <span>{stateSummary(model.state)}</span>
      <button className="models-delete-button" type="button">삭제</button>
    </div>
  );
}

function DownloadableModelRow({ model }: { readonly model: DownloadableModel }) {
  return (
    <article className="models-download-row" data-family={model.family} data-state={model.state} data-selected={model.selected ?? false}>
      <div className="models-row-topline">
        <div className="models-row-copy">
          <div className="models-title-line">
            <strong>{model.name}</strong>
            {model.supportsVision ? <span className="models-inline-badge">Vision</span> : null}
            {model.selected ? <span className="models-inline-badge" data-tone="neutral">사용 중</span> : null}
          </div>
          <p>{model.description}</p>
        </div>
        <ModelMetrics model={model} />
      </div>
      <StateControls model={model} />
    </article>
  );
}

function DownloadSection({ title, models }: { readonly title: string; readonly models: readonly DownloadableModel[] }) {
  return (
    <SectionCard title={title}>
      <div className="models-download-list">
        {models.map((model) => <DownloadableModelRow model={model} key={model.id} />)}
      </div>
    </SectionCard>
  );
}

function DeviceCapabilityCards() {
  return (
    <div className="models-device-area" aria-label="device capability mock">
      <div className="models-info-pills">
        {devicePills.map((pill) => (
          <span className="models-info-pill" key={pill.label}>
            <span aria-hidden="true">{pill.icon}</span>
            {pill.label}
          </span>
        ))}
      </div>
      <div className="models-device-cards">
        {deviceCards.map((card) => (
          <article className="models-device-card" data-tone={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function StorageSection() {
  return (
    <SectionCard title="저장 공간" eyebrow="UI-only">
      <div className="models-storage-row">
        <span>모델 위치:</span>
        <code>~/.cache/huggingface/hub/</code>
      </div>
      <button className="models-secondary-button" type="button">Finder에서 열기</button>
      <p className="models-storage-note">실제 디렉터리 생성이나 Finder 호출 없이 Swift 저장 위치 row를 시각적으로만 복제합니다.</p>
    </SectionCard>
  );
}

export function ModelsPanelMock() {
  return (
    <div className="models-panel-mock" data-testid="models-panel-mock">
      <header className="models-panel-header">
        <div>
          <p>Downloads</p>
          <h1>모델 관리</h1>
        </div>
        <span className="models-header-status">mock states · no provider side effects</span>
      </header>

      <DeviceCapabilityCards />
      <DownloadSection title="STT 모델" models={sttModels} />
      <DownloadSection title="LLM 모델" models={llmModels} />
      <StorageSection />
    </div>
  );
}
