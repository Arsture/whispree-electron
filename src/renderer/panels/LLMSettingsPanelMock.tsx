import type { ReactNode } from 'react';

import '../styles/settings-llm.css';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
type ProviderId = 'none' | 'local' | 'openai' | 'groq';
type Grade = 'RUNS GREAT' | 'RUNS WELL' | 'DECENT' | 'TIGHT FIT' | 'BARELY RUNS' | 'TOO HEAVY';

type Metric = {
  readonly label: string;
  readonly value: string;
  readonly tone?: Tone;
};

type ModelCard = {
  readonly id: string;
  readonly provider: Exclude<ProviderId, 'none'>;
  readonly title: string;
  readonly description: string;
  readonly selected?: boolean;
  readonly vision?: boolean;
  readonly grade: Grade;
  readonly gradeTone?: Tone;
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
  { id: 'none', label: '없음 (원문 사용)', subtitle: 'LLM 교정 비활성화', selected: false },
  { id: 'local', label: '로컬 MLX', subtitle: '온디바이스 MLX/MLX-VLM', selected: true },
  { id: 'openai', label: 'OpenAI (GPT)', subtitle: 'Codex CLI 또는 OpenAI 로그인', selected: false },
  { id: 'groq', label: 'Groq Cloud', subtitle: 'STT와 API Key 공유', selected: false },
] as const;

const localModels: readonly ModelCard[] = [
  {
    id: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
    provider: 'local',
    title: 'Qwen3 4B (4-bit)',
    description: '균형 잡힌 교정 — 속도와 품질의 기본값',
    selected: true,
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '~2.1 GB' },
      { label: 'RAM', value: '≈32%' },
      { label: 'Speed', value: 'tok/s' },
      { label: 'Quality', value: '15' },
    ],
    status: '다운로드됨',
    statusTone: 'success',
  },
  {
    id: 'mlx-community/Qwen3-8B-4bit',
    provider: 'local',
    title: 'Qwen3 8B (4-bit)',
    description: '고품질 한국어 교정 — 느리지만 정확',
    grade: 'RUNS WELL',
    metrics: [
      { label: 'Size', value: '~4.3 GB' },
      { label: 'RAM', value: '≈45%' },
      { label: 'Speed', value: 'tok/s' },
      { label: 'Quality', value: '20' },
    ],
    status: '다운로드 필요',
    statusTone: 'warning',
  },
  {
    id: 'mlx-community/Qwen3-VL-4B-Instruct-8bit',
    provider: 'local',
    title: 'Qwen3 VL 4B (8-bit)',
    description: '비전+텍스트 교정 — 스크린샷 컨텍스트 활용',
    vision: true,
    grade: 'RUNS WELL',
    metrics: [
      { label: 'Size', value: '~4.8 GB' },
      { label: 'RAM', value: '≈48%' },
      { label: 'Speed', value: 'tok/s' },
      { label: 'Quality', value: '30' },
    ],
    status: '다운로드 필요',
    statusTone: 'warning',
  },
];

const openAIModels: readonly ModelCard[] = [
  {
    id: 'gpt-5.5',
    provider: 'openai',
    title: 'GPT-5.5 (Latest)',
    description: '최신 최고 품질. 긴 컨텍스트와 복잡한 교정에 적합',
    selected: true,
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '1100ms' },
      { label: 'Quality', value: '100' },
    ],
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    title: 'GPT-5.4',
    description: '고품질. 코딩 + 추론 통합 모델',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '1200ms' },
      { label: 'Quality', value: '94' },
    ],
  },
  {
    id: 'gpt-5.4-mini',
    provider: 'openai',
    title: 'GPT-5.4 Mini (Fast)',
    description: '빠른 응답. 짧은 교정에 적합',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '600ms' },
      { label: 'Quality', value: '78' },
    ],
  },
  {
    id: 'gpt-5.3-codex',
    provider: 'openai',
    title: 'GPT-5.3 Codex',
    description: '코딩 특화. 기술 용어 교정에 강함',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '800ms' },
      { label: 'Quality', value: '82' },
    ],
  },
  {
    id: 'gpt-5.2',
    provider: 'openai',
    title: 'GPT-5.2',
    description: '이전 세대. 호환성 우선',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '900ms' },
      { label: 'Quality', value: '75' },
    ],
  },
];

const groqModels: readonly ModelCard[] = [
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'groq',
    title: 'Llama 4 Scout 17B (Vision)',
    description: 'Llama 4 Scout — Groq에서 유일하게 이미지 입력 지원 (17B MoE, 16 expert)',
    selected: true,
    vision: true,
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '400ms' },
      { label: 'Quality', value: '84' },
    ],
  },
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    title: 'Llama 3.3 70B Versatile',
    description: '70B 범용 모델. 교정 품질 균형. (텍스트 전용)',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '500ms' },
      { label: 'Quality', value: '88' },
    ],
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    title: 'Llama 3.1 8B Instant',
    description: '8B 초경량 모델. 응답 매우 빠름. (텍스트 전용)',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '200ms' },
      { label: 'Quality', value: '70' },
    ],
  },
  {
    id: 'qwen/qwen3-32b',
    provider: 'groq',
    title: 'Qwen3 32B',
    description: 'Qwen3 32B. 한국어 + 다국어 강함. (텍스트 전용)',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '350ms' },
      { label: 'Quality', value: '86' },
    ],
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    title: 'GPT-OSS 120B',
    description: 'OpenAI 오픈 웨이트 120B. 추론 우수. (텍스트 전용)',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '700ms' },
      { label: 'Quality', value: '92' },
    ],
  },
  {
    id: 'openai/gpt-oss-20b',
    provider: 'groq',
    title: 'GPT-OSS 20B',
    description: 'OpenAI 오픈 웨이트 20B. 속도/품질 균형. (텍스트 전용)',
    grade: 'RUNS GREAT',
    metrics: [
      { label: 'Size', value: '☁️' },
      { label: 'Latency', value: '300ms' },
      { label: 'Quality', value: '78' },
    ],
  },
];

const correctionModes: readonly CorrectionMode[] = [
  {
    id: 'standard',
    title: 'Standard (STT Correction)',
    description: 'Fix STT errors: spacing, punctuation, misheard words',
    selected: true,
  },
  {
    id: 'fillerRemoval',
    title: 'Filler Removal',
    description: 'STT correction + remove fillers (음, 어, 그러니까)',
  },
  {
    id: 'structured',
    title: 'Structured',
    description: 'STT correction + filler removal + organize with bullet points',
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Use your own custom system prompt',
  },
];

const promptPreview = `You are Whispree's correction engine.
- Preserve the speaker's intent and language.
- Fix transcription errors, punctuation, spacing, and obvious grammar issues.
- Do not invent details that were not spoken.
- If screenshot context is provided, use it only to disambiguate app-specific terms.`;

function SectionCard({ title, eyebrow, children }: { readonly title: string; readonly eyebrow?: string; readonly children: ReactNode }) {
  return (
    <section className="llm-section">
      <div className="llm-section-heading">
        <h2>{title}</h2>
        {eyebrow ? <span>{eyebrow}</span> : null}
      </div>
      <div className="llm-liquid-card">{children}</div>
    </section>
  );
}

function RadioMark({ selected }: { readonly selected?: boolean }) {
  return <span className="llm-radio-mark" aria-hidden="true">{selected ? '✓' : ''}</span>;
}

function ProviderSelector() {
  return (
    <SectionCard title="교정 엔진">
      <div className="llm-provider-selector" role="radiogroup" aria-label="LLM provider mock selector">
        {providers.map((provider) => (
          <div className="llm-provider-option" data-selected={provider.selected ?? false} role="radio" aria-checked={provider.selected ?? false} tabIndex={0} key={provider.id}>
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

function ModelMetrics({ metrics, grade, gradeTone = 'neutral' }: { readonly metrics: readonly Metric[]; readonly grade: Grade; readonly gradeTone?: Tone }) {
  return (
    <div className="llm-model-metrics" aria-label="model metrics">
      <span className="llm-compatibility-badge" data-tone={gradeTone}>{grade}</span>
      <div className="llm-metric-row">
        {metrics.map((metric) => (
          <span className="llm-metric" data-tone={metric.tone ?? 'neutral'} key={`${metric.label}-${metric.value}`}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function ModelRow({ model }: { readonly model: ModelCard }) {
  return (
    <div className="llm-model-row" data-selected={model.selected ?? false} role="radio" aria-checked={model.selected ?? false} tabIndex={0}>
      <div className="llm-model-main">
        <RadioMark selected={model.selected} />
        <div className="llm-model-copy">
          <div className="llm-model-title-line">
            <strong>{model.title}</strong>
            {model.vision ? <span className="llm-vision-icon" aria-label="supports vision">👁</span> : null}
          </div>
          <small>{model.description}</small>
        </div>
        <ModelMetrics metrics={model.metrics} grade={model.grade} gradeTone={model.gradeTone} />
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

function ModelSection({ title, eyebrow, models }: { readonly title: string; readonly eyebrow?: string; readonly models: readonly ModelCard[] }) {
  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      <div className="llm-model-list" role="radiogroup" aria-label={`${title} mock models`}>
        {models.map((model) => <ModelRow model={model} key={model.id} />)}
      </div>
    </SectionCard>
  );
}

function ToggleRow({ title, description, enabled }: { readonly title: string; readonly description: string; readonly enabled: boolean }) {
  return (
    <div className="llm-toggle-row">
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <span className="llm-switch" data-on={enabled} role="switch" aria-checked={enabled} aria-label={title} />
    </div>
  );
}

function ScreenshotContextSection() {
  return (
    <SectionCard title="스크린샷 컨텍스트">
      <ToggleRow title="활성화" description="녹음 시 화면을 캡처하여 교정 정확도를 높입니다" enabled />
      <div className="llm-divider" />
      <ToggleRow title="에이전트에 전달" description="텍스트 삽입 후 캡처된 스크린샷을 대상 앱에 이미지로 붙여넣습니다" enabled={false} />
    </SectionCard>
  );
}

function OpenAIAuthSection() {
  return (
    <SectionCard title="OpenAI 인증">
      <div className="llm-auth-stack">
        <div className="llm-auth-row">
          <span>인증 방식:</span>
          <span className="llm-auth-value">Codex CLI</span>
          <span className="llm-auth-badge" data-tone="success">✓</span>
        </div>
        <div className="llm-auth-row">
          <span>Account:</span>
          <code>acct_mocked_codex_user</code>
        </div>
        <div className="llm-auth-warning" data-tone="warning">
          <span aria-hidden="true">!</span>
          로그인이 필요합니다
        </div>
        <div className="llm-auth-actions" aria-label="OpenAI auth actions mock">
          <button type="button">OpenAI 로그인</button>
          <button type="button">Codex 인증 확인</button>
        </div>
        <p className="llm-auth-help">Codex CLI가 설치되어 있으면 자동 감지됩니다</p>
      </div>
    </SectionCard>
  );
}

function GroqApiKeySection() {
  return (
    <SectionCard title="Groq API Key">
      <div className="llm-auth-stack">
        <label className="llm-secret-field">
          <span>API Key</span>
          <input readOnly type="password" value="configured" aria-label="API Key" />
        </label>
        <div className="llm-model-status" data-tone="success">
          <span aria-hidden="true">✓</span>
          API Key 설정됨 (STT와 공유)
        </div>
      </div>
    </SectionCard>
  );
}

function ModelStatusNotice() {
  return (
    <div className="llm-status-notice" data-tone="accent">
      <span aria-hidden="true">↓</span>
      다운로드 탭에서 ‘Qwen3 4B (4-bit)’ 을 다운로드하세요.
    </div>
  );
}

function CorrectionModeSection() {
  return (
    <SectionCard title="교정 모드">
      <div className="llm-correction-list" role="radiogroup" aria-label="Correction mode mock selector">
        {correctionModes.map((mode) => (
          <div className="llm-correction-row" data-selected={mode.selected ?? false} role="radio" aria-checked={mode.selected ?? false} tabIndex={0} key={mode.id}>
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
    <SectionCard title="시스템 프롬프트">
      <div className="llm-prompt-stack">
        <div className="llm-prompt-pane">
          <div className="llm-prompt-label">Default preview</div>
          <pre>{promptPreview}</pre>
        </div>
        <div className="llm-prompt-pane" data-editor="true">
          <div className="llm-prompt-label">Custom editor</div>
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
      <ProviderSelector />
      <ModelSection title="로컬 모델" eyebrow="Apple Silicon · local branch" models={localModels} />
      <ScreenshotContextSection />
      <ModelStatusNotice />
      <ModelSection title="OpenAI 모델" eyebrow="cloud branch" models={openAIModels} />
      <OpenAIAuthSection />
      <ModelSection title="Groq 모델" eyebrow="cloud branch" models={groqModels} />
      <GroqApiKeySection />
      <CorrectionModeSection />
      <SystemPromptSection />
    </div>
  );
}

export default LLMSettingsPanelMock;
