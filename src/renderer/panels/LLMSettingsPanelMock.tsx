import type { ReactNode } from 'react';

import '../styles/settings-llm.css';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
type ProviderId = 'local' | 'openai' | 'groq';

type Metric = {
  readonly label: string;
  readonly value: string;
  readonly tone?: Tone;
};

type ModelCard = {
  readonly id: string;
  readonly provider: ProviderId;
  readonly title: string;
  readonly description: string;
  readonly selected?: boolean;
  readonly vision?: boolean;
  readonly badge: string;
  readonly badgeTone: Tone;
  readonly metrics: readonly Metric[];
  readonly status?: string;
  readonly statusTone?: Tone;
};

type CorrectionMode = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly selected?: boolean;
};

const providers = [
  { id: 'local', label: 'Local', subtitle: '온디바이스 모델', selected: true },
  { id: 'openai', label: 'OpenAI', subtitle: 'Codex/OAuth 인증', selected: false },
  { id: 'groq', label: 'Groq', subtitle: 'API Key 공유', selected: false },
] as const;

const modelCards: readonly ModelCard[] = [
  {
    id: 'qwen25-7b-instruct',
    provider: 'local',
    title: 'Qwen2.5 7B Instruct',
    description: '빠른 로컬 교정 · 한국어/영어 균형형',
    selected: true,
    badge: 'Runs Great',
    badgeTone: 'success',
    metrics: [
      { label: 'Size', value: '4.4 GB' },
      { label: 'RAM', value: '38%' },
      { label: 'tok/s', value: '~24' },
      { label: 'Quality', value: '82', tone: 'success' },
    ],
    status: '다운로드됨 · 준비 완료',
    statusTone: 'success',
  },
  {
    id: 'llava-next-7b',
    provider: 'local',
    title: 'LLaVA Next 7B',
    description: '로컬 vision 모델 · 스크린샷 컨텍스트 지원',
    vision: true,
    badge: 'Vision',
    badgeTone: 'accent',
    metrics: [
      { label: 'Size', value: '5.1 GB' },
      { label: 'RAM', value: '54%', tone: 'warning' },
      { label: 'tok/s', value: '~11' },
      { label: 'Quality', value: '78' },
    ],
    status: '다운로드 탭에서 모델을 준비하세요.',
    statusTone: 'warning',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    title: 'GPT-4o mini',
    description: '저지연 클라우드 교정 · 비용 효율 우선',
    selected: true,
    badge: 'Cloud',
    badgeTone: 'success',
    metrics: [
      { label: 'Latency', value: '~700ms' },
      { label: 'Vision', value: 'Yes', tone: 'accent' },
      { label: 'Quality', value: '88', tone: 'success' },
    ],
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    title: 'GPT-4.1',
    description: '고품질 문맥 교정 · 긴 프롬프트와 스크린샷에 적합',
    badge: 'Best',
    badgeTone: 'accent',
    metrics: [
      { label: 'Latency', value: '~1200ms' },
      { label: 'Vision', value: 'Yes', tone: 'accent' },
      { label: 'Quality', value: '96', tone: 'success' },
    ],
  },
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    title: 'Llama 3.3 70B Versatile',
    description: 'Groq 고속 텍스트 교정 · STT와 API Key 공유',
    selected: true,
    badge: 'Fast Cloud',
    badgeTone: 'success',
    metrics: [
      { label: 'Latency', value: '~240ms', tone: 'success' },
      { label: 'Vision', value: 'No' },
      { label: 'Quality', value: '90', tone: 'success' },
    ],
  },
  {
    id: 'llama-4-scout-17b',
    provider: 'groq',
    title: 'Llama 4 Scout 17B',
    description: 'Groq vision 경로 · 스크린샷 컨텍스트 지원 mock',
    vision: true,
    badge: 'Vision',
    badgeTone: 'accent',
    metrics: [
      { label: 'Latency', value: '~320ms', tone: 'success' },
      { label: 'Vision', value: 'Yes', tone: 'accent' },
      { label: 'Quality', value: '86' },
    ],
  },
];

const correctionModes: readonly CorrectionMode[] = [
  {
    id: 'conservative',
    title: '보수적 교정',
    description: '원문을 최대한 유지하고 명백한 오타와 띄어쓰기만 수정합니다.',
    selected: true,
  },
  {
    id: 'balanced',
    title: '균형 교정',
    description: '말투를 보존하면서 문장 부호, 중복어, 가벼운 표현을 다듬습니다.',
  },
  {
    id: 'aggressive',
    title: '적극 교정',
    description: '전달력을 높이기 위해 문장 구조를 더 자연스럽게 재작성합니다.',
  },
  {
    id: 'custom',
    title: 'Custom',
    description: '아래 시스템 프롬프트를 직접 편집해 교정 규칙을 지정합니다.',
  },
];

const promptPreview = `You are Whispree's correction engine.
- Preserve the speaker's intent and language.
- Fix transcription errors, punctuation, spacing, and obvious grammar issues.
- Do not invent details that were not spoken.
- If screenshot context is provided, use it only to disambiguate app-specific terms.`;

function SectionCard({ title, eyebrow, children }: { readonly title: string; readonly eyebrow?: string; readonly children: ReactNode }) {
  return (
    <section className="llm-liquid-card">
      <div className="llm-card-heading">
        <h2>{title}</h2>
        {eyebrow ? <span>{eyebrow}</span> : null}
      </div>
      {children}
    </section>
  );
}

function RadioMark({ selected }: { readonly selected?: boolean }) {
  return <span className="llm-radio-mark" aria-hidden="true">{selected ? '✓' : ''}</span>;
}

function ProviderSelector() {
  return (
    <SectionCard title="교정 엔진" eyebrow="provider selector">
      <div className="llm-provider-selector" role="radiogroup" aria-label="LLM provider mock selector">
        {providers.map((provider) => (
          <div className="llm-provider-option" data-selected={provider.selected} role="radio" aria-checked={provider.selected} tabIndex={0} key={provider.id}>
            <RadioMark selected={provider.selected} />
            <div>
              <strong>{provider.label}</strong>
              <small>{provider.subtitle}</small>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ModelMetrics({ metrics }: { readonly metrics: readonly Metric[] }) {
  return (
    <div className="llm-model-metrics" aria-label="model metrics">
      {metrics.map((metric) => (
        <span className="llm-metric" data-tone={metric.tone ?? 'neutral'} key={`${metric.label}-${metric.value}`}>
          <small>{metric.label}</small>
          <strong>{metric.value}</strong>
        </span>
      ))}
    </div>
  );
}

function ModelRow({ model }: { readonly model: ModelCard }) {
  return (
    <div className="llm-model-row" data-selected={model.selected} role="radio" aria-checked={model.selected ?? false} tabIndex={0}>
      <div className="llm-model-main">
        <RadioMark selected={model.selected} />
        <div className="llm-model-copy">
          <div className="llm-model-title-line">
            <strong>{model.title}</strong>
            {model.vision ? <span className="llm-vision-icon" aria-label="supports vision">◉</span> : null}
            <span className="llm-badge" data-tone={model.badgeTone}>{model.badge}</span>
          </div>
          <small>{model.description}</small>
        </div>
        <ModelMetrics metrics={model.metrics} />
      </div>
      {model.status ? (
        <div className="llm-model-status" data-tone={model.statusTone ?? 'neutral'}>
          <span aria-hidden="true">{model.statusTone === 'success' ? '✓' : '↓'}</span>
          {model.status}
        </div>
      ) : null}
    </div>
  );
}

function ModelSection({ provider, title, eyebrow }: { readonly provider: ProviderId; readonly title: string; readonly eyebrow: string }) {
  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      <div className="llm-model-list" role="radiogroup" aria-label={`${title} mock models`}>
        {modelCards.filter((model) => model.provider === provider).map((model) => <ModelRow model={model} key={model.id} />)}
      </div>
    </SectionCard>
  );
}

function ToggleRow({ title, description, enabled, disabled }: { readonly title: string; readonly description: string; readonly enabled: boolean; readonly disabled?: boolean }) {
  return (
    <div className="llm-toggle-row" data-disabled={disabled ?? false}>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <span className="llm-switch" data-on={enabled} data-disabled={disabled ?? false} role="switch" aria-checked={enabled} aria-label={title} />
    </div>
  );
}

function ScreenshotContextSection() {
  return (
    <SectionCard title="스크린샷 컨텍스트" eyebrow="vision">
      <ToggleRow title="활성화" description="녹음 시 화면을 캡처하여 교정 정확도를 높입니다" enabled />
      <div className="llm-divider" />
      <ToggleRow title="에이전트에 전달" description="텍스트 삽입 후 캡처된 스크린샷을 대상 앱에 이미지로 붙여넣습니다" enabled={false} />
      <div className="llm-inline-note" data-tone="accent">
        <span aria-hidden="true">◉</span>
        vision 모델에서만 표시되는 Swift 조건부 섹션을 mock으로 노출합니다.
      </div>
    </SectionCard>
  );
}

function OpenAIAuthSection() {
  return (
    <SectionCard title="OpenAI 인증" eyebrow="auth mock">
      <div className="llm-auth-stack">
        <div className="llm-auth-row">
          <span>인증 방식:</span>
          <strong>Codex CLI</strong>
          <span className="llm-auth-badge" data-tone="success">✓ 감지됨</span>
        </div>
        <div className="llm-auth-row">
          <span>Account:</span>
          <code>acct_mocked_codex_user</code>
        </div>
        <div className="llm-auth-warning" data-tone="warning">
          <span aria-hidden="true">!</span>
          로그아웃 상태에서는 “OpenAI 로그인”, 브라우저 로그인 진행, Codex 인증 확인 버튼이 표시됩니다.
        </div>
        <div className="llm-auth-actions" aria-label="OpenAI auth actions mock">
          <button type="button">OpenAI 로그인</button>
          <button type="button">Codex 인증 확인</button>
        </div>
      </div>
    </SectionCard>
  );
}

function CorrectionModeSection() {
  return (
    <SectionCard title="교정 모드" eyebrow="rows">
      <div className="llm-correction-list" role="radiogroup" aria-label="Correction mode mock selector">
        {correctionModes.map((mode) => (
          <div className="llm-correction-row" data-selected={mode.selected} role="radio" aria-checked={mode.selected ?? false} tabIndex={0} key={mode.id}>
            <RadioMark selected={mode.selected} />
            <div>
              <strong>{mode.title}</strong>
              <small>{mode.description}</small>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SystemPromptSection() {
  return (
    <SectionCard title="시스템 프롬프트" eyebrow="preview/editor">
      <div className="llm-prompt-grid">
        <div className="llm-prompt-pane">
          <div className="llm-prompt-label">Preview</div>
          <pre>{promptPreview}</pre>
          <p>“Custom” 모드에서 직접 편집할 수 있습니다.</p>
        </div>
        <div className="llm-prompt-pane" data-editor="true">
          <div className="llm-prompt-label">Custom editor mock</div>
          <textarea readOnly value={`${promptPreview}\n- Keep domain terms from the custom dictionary unchanged.`} aria-label="Custom system prompt mock editor" />
          <div className="llm-save-row">
            <button type="button">저장</button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function LLMSettingsPanelMock() {
  return (
    <div className="llm-settings-mock" data-testid="llm-settings-panel-mock">
      <header className="llm-panel-header">
        <div>
          <p>Large Language Model</p>
          <h1>교정 설정</h1>
        </div>
        <span className="llm-header-status">UI parity mock · no backend</span>
      </header>

      <ProviderSelector />

      <div className="llm-model-grid">
        <ModelSection provider="local" title="로컬 모델" eyebrow="device · 18 GB" />
        <ModelSection provider="openai" title="OpenAI 모델" eyebrow="cloud vision" />
        <ModelSection provider="groq" title="Groq 모델" eyebrow="fast cloud" />
      </div>

      <ScreenshotContextSection />
      <OpenAIAuthSection />
      <CorrectionModeSection />
      <SystemPromptSection />
    </div>
  );
}

export default LLMSettingsPanelMock;
