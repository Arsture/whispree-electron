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

const sttModels: readonly DownloadableModel[] = [
  {
    id: 'whisperkit-large-v3-turbo',
    family: 'stt',
    name: 'WhisperKit Large V3 Turbo',
    description: '로컬 CoreML+ANE, 99개 언어',
    grade: 'RUNS WELL',
    state: 'ready',
    metrics: [
      { icon: 'internaldrive', label: '~1.5 GB' },
      { icon: 'memorychip', label: 'RAM 15%' },
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
      { icon: 'memorychip', label: 'RAM 13%' },
      { icon: 'chart.bar', label: 'Quality 65' },
    ],
  },
];

const llmModels: readonly DownloadableModel[] = [
  {
    id: 'mlx-community/gemma-4-e2b-it-4bit',
    family: 'llm',
    name: 'Gemma 4 2B (4-bit)',
    description: '경량 Gemma — 빠른 속도',
    grade: 'RUNS WELL',
    state: 'not-downloaded',
    totalText: '3.61 GB',
    metrics: [
      { icon: 'internaldrive', label: '~3.6 GB' },
      { icon: 'memorychip', label: 'RAM 25%' },
      { icon: 'bolt', label: '22 tok/s' },
      { icon: 'chart.bar', label: 'Quality 8', tone: 'danger' },
    ],
  },
  {
    id: 'mlx-community/gemma-4-e4b-it-4bit',
    family: 'llm',
    name: 'Gemma 4 4B (4-bit)',
    description: '균형 잡힌 Gemma — 속도와 품질',
    grade: 'RUNS WELL',
    state: 'not-downloaded',
    totalText: '5.25 GB',
    metrics: [
      { icon: 'internaldrive', label: '~5.3 GB' },
      { icon: 'memorychip', label: 'RAM 29%' },
      { icon: 'bolt', label: '15 tok/s' },
      { icon: 'chart.bar', label: 'Quality 15', tone: 'danger' },
    ],
  },
  {
    id: 'lmstudio-community/gemma-4-26B-A4B-it-MLX-4bit',
    family: 'llm',
    name: 'Gemma 4 26B MoE (4-bit)',
    description: 'Gemma MoE — 전체 26B RAM 필요, 활성 4B (uv 필요)',
    grade: 'TIGHT FIT',
    state: 'not-downloaded',
    totalText: '15.64 GB',
    metrics: [
      { icon: 'internaldrive', label: '~15.6 GB' },
      { icon: 'memorychip', label: 'RAM 58%' },
      { icon: 'bolt', label: '5 tok/s' },
      { icon: 'chart.bar', label: 'Quality 28', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/gemma-4-31b-it-4bit',
    family: 'llm',
    name: 'Gemma 4 31B (4-bit)',
    description: '대형 Gemma — 최고 품질, 48GB+ RAM 추천',
    grade: 'TIGHT FIT',
    state: 'not-downloaded',
    totalText: '18.44 GB',
    metrics: [
      { icon: 'internaldrive', label: '~18.4 GB' },
      { icon: 'memorychip', label: 'RAM 66%' },
      { icon: 'bolt', label: '4 tok/s' },
      { icon: 'chart.bar', label: 'Quality 30', tone: 'warning' },
    ],
  },
  {
    id: 'Jiunsong/supergemma4-26b-uncensored-mlx-4bit-v2',
    family: 'llm',
    name: 'SuperGemma4 26B MoE (4-bit)',
    description: 'Gemma 4 26B 파인튜닝 — 한국어/코딩 강점 (uv 필요)',
    grade: 'TIGHT FIT',
    state: 'not-downloaded',
    totalText: '14.23 GB',
    metrics: [
      { icon: 'internaldrive', label: '~14.2 GB' },
      { icon: 'memorychip', label: 'RAM 53%' },
      { icon: 'bolt', label: '5 tok/s' },
      { icon: 'chart.bar', label: 'Quality 29', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/diffusiongemma-26B-A4B-it-4bit',
    family: 'llm',
    name: 'DiffusionGemma 26B MoE (4-bit)',
    description: 'DiffusionGemma VLM — 블록 확산 생성, 스크린샷 교정 지원 (uv 필요)',
    grade: 'TIGHT FIT',
    state: 'not-downloaded',
    supportsVision: true,
    totalText: '15.6 GB',
    metrics: [
      { icon: 'internaldrive', label: '~15.6 GB' },
      { icon: 'memorychip', label: 'RAM 58%' },
      { icon: 'bolt', label: '5 tok/s' },
      { icon: 'chart.bar', label: 'Quality 31', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/Qwen3-1.7B-4bit',
    family: 'llm',
    name: 'Qwen3 1.7B (4-bit)',
    description: '경량 교정 — 빠른 속도, 적은 메모리',
    grade: 'RUNS GREAT',
    state: 'not-downloaded',
    totalText: '940 MB',
    metrics: [
      { icon: 'internaldrive', label: '~940 MB' },
      { icon: 'memorychip', label: 'RAM 17%' },
      { icon: 'bolt', label: '87 tok/s' },
      { icon: 'chart.bar', label: 'Quality 5', tone: 'danger' },
    ],
  },
  {
    id: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
    family: 'llm',
    name: 'Qwen3 4B (4-bit)',
    description: '균형 잡힌 교정 — 속도와 품질의 기본값',
    grade: 'RUNS WELL',
    state: 'ready',
    selected: true,
    metrics: [
      { icon: 'internaldrive', label: '~2.1 GB' },
      { icon: 'memorychip', label: 'RAM 21%' },
      { icon: 'bolt', label: '39 tok/s' },
      { icon: 'chart.bar', label: 'Quality 15', tone: 'danger' },
    ],
  },
  {
    id: 'mlx-community/Qwen3-8B-4bit',
    family: 'llm',
    name: 'Qwen3 8B (4-bit)',
    description: '고품질 한국어 교정 — 느리지만 정확',
    grade: 'RUNS WELL',
    state: 'downloading',
    progress: 0.37,
    downloadedText: '1.6 GB',
    totalText: '4.3 GB',
    metrics: [
      { icon: 'internaldrive', label: '~4.3 GB' },
      { icon: 'memorychip', label: 'RAM 27%' },
      { icon: 'bolt', label: '19 tok/s' },
      { icon: 'chart.bar', label: 'Quality 20', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
    family: 'llm',
    name: 'Qwen3 Coder 30B MoE (4-bit)',
    description: '코딩 특화 MoE — 전체 30B RAM 필요, 활성 3B',
    grade: 'TIGHT FIT',
    state: 'queued',
    totalText: '16 GB',
    metrics: [
      { icon: 'internaldrive', label: '~16.0 GB' },
      { icon: 'memorychip', label: 'RAM 59%' },
      { icon: 'bolt', label: '5 tok/s' },
      { icon: 'chart.bar', label: 'Quality 25', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/GLM-4.7-Flash-4bit',
    family: 'llm',
    name: 'GLM-4.7 Flash (4-bit)',
    description: '중국어/한국어 강점 — 대형 모델',
    grade: 'TIGHT FIT',
    state: 'error',
    errorText: '디스크 공간 부족 — 16 GB 필요',
    metrics: [
      { icon: 'internaldrive', label: '~16.0 GB' },
      { icon: 'memorychip', label: 'RAM 59%' },
      { icon: 'bolt', label: '5 tok/s' },
      { icon: 'chart.bar', label: 'Quality 22', tone: 'warning' },
    ],
  },
  {
    id: 'mlx-community/Qwen3-VL-4B-Instruct-8bit',
    family: 'llm',
    name: 'Qwen3 VL 4B (8-bit)',
    description: '비전+텍스트 교정 — 스크린샷 컨텍스트 활용',
    grade: 'RUNS WELL',
    state: 'not-downloaded',
    supportsVision: true,
    totalText: '4.8 GB',
    metrics: [
      { icon: 'internaldrive', label: '~4.8 GB' },
      { icon: 'memorychip', label: 'RAM 28%' },
      { icon: 'bolt', label: '17 tok/s' },
      { icon: 'chart.bar', label: 'Quality 30', tone: 'warning' },
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

function SectionCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="models-section">
      <h2>{title}</h2>
      <div className="models-liquid-card">
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
        <div className="models-state-line" data-tone="neutral">
          <span>{progressLabel(model)}</span>
          <button className="models-ghost-button" type="button">취소</button>
        </div>
      </div>
    );
  }

  if (model.state === 'loading') {
    return (
      <div className="models-state-line" data-tone="neutral">
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
    <div className="models-state-line" data-tone="neutral">
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

function DeviceCapabilityPills() {
  return (
    <div className="models-info-pills" aria-label="device capability mock">
      {devicePills.map((pill) => (
        <span className="models-info-pill" key={pill.label}>
          <span aria-hidden="true">{pill.icon}</span>
          {pill.label}
        </span>
      ))}
    </div>
  );
}

function StorageSection() {
  return (
    <SectionCard title="저장 공간">
      <div className="models-storage-content">
        <div className="models-storage-row">
          <span>모델 위치:</span>
          <code>~/.cache/huggingface/hub/</code>
        </div>
        <button className="models-secondary-button" type="button">Finder에서 열기</button>
      </div>
    </SectionCard>
  );
}

export function ModelsPanelMock() {
  return (
    <div className="models-panel-mock" data-testid="models-panel-mock">
      <DeviceCapabilityPills />
      <DownloadSection title="STT 모델" models={sttModels} />
      <DownloadSection title="LLM 모델" models={llmModels} />
      <StorageSection />
    </div>
  );
}
