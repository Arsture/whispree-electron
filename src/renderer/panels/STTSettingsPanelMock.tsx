import type { ReactNode } from 'react';
import type { AppSettingsSnapshot, STTProviderType } from '../../shared/settings';

import '../styles/settings-stt.css';

type ProviderTone = 'neutral' | 'warning' | 'success';
type ProviderState = 'ready' | 'loading' | 'downloading' | 'download-required' | 'error';
type CompatibilityGrade = 'RUNS GREAT' | 'RUNS WELL' | 'DECENT' | 'TIGHT FIT' | 'BARELY RUNS' | 'TOO HEAVY';

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
    id: 'groq',
    title: 'Groq Cloud API',
    description: '클라우드 STT, API Key 필요',
    grade: 'RUNS GREAT',
    state: 'ready',
    selected: false,
    metrics: [
      { icon: '☁', label: '☁️' },
      { icon: '⌁', label: '200ms' },
      { icon: '▥', label: 'Quality 95' },
    ],
    stateCopy: 'Ready',
  },
  {
    id: 'mlx-audio',
    title: 'MLX Audio',
    description: 'mlx-audio, 한중일영 (uv 필요)',
    grade: 'RUNS GREAT',
    state: 'download-required',
    selected: false,
    metrics: [
      { icon: '◼', label: '~1.0 GB' },
      { icon: '▣', label: 'RAM 12%' },
      { icon: '▥', label: 'Quality 65' },
    ],
    stateCopy: '다운로드 필요',
  },
  {
    id: 'whisperkit',
    title: 'WhisperKit',
    description: '로컬 CoreML+ANE, 99개 언어',
    grade: 'RUNS GREAT',
    state: 'ready',
    selected: true,
    metrics: [
      { icon: '◼', label: '~1.5 GB' },
      { icon: '▣', label: 'RAM 18%' },
      { icon: '▥', label: 'Quality 75' },
    ],
    stateCopy: 'Ready',
  },
];

function gradeTone(grade: CompatibilityGrade): ProviderTone {
  if (grade === 'TIGHT FIT') return 'warning';
  if (grade === 'BARELY RUNS' || grade === 'TOO HEAVY') return 'warning';
  return 'neutral';
}

function stateTone(state: ProviderState): ProviderTone {
  if (state === 'download-required') return 'warning';
  if (state === 'error') return 'warning';
  return 'neutral';
}

function stateIcon(state: ProviderState): string {
  if (state === 'ready') return '✓';
  if (state === 'download-required') return '↓';
  if (state === 'downloading') return '◌';
  if (state === 'loading') return '◌';
  return '×';
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
      {provider.selected ? (
        <div className="stt-provider-state" data-tone={stateTone(provider.state)}>
          <span aria-hidden="true">{stateIcon(provider.state)}</span>
          <span>{provider.stateCopy}</span>
        </div>
      ) : null}
    </div>
  );
}

function LiquidSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="stt-liquid-section">
      <h2>{title}</h2>
      <div className="stt-liquid-card">{children}</div>
    </section>
  );
}

function ApiKeySection({ configured }: { readonly configured: boolean }) {
  return (
    <LiquidSection title="API Key">
      <div className="stt-api-key-block">
        <input readOnly type="password" value={configured ? 'configured-api-key' : ''} placeholder="API Key" aria-label="Groq API Key" />
        <div className="stt-inline-note" data-tone={configured ? 'neutral' : 'warning'}>
          <span aria-hidden="true">{configured ? '✓' : 'i'}</span>
          {configured ? 'API Key 설정됨' : 'console.groq.com에서 무료 API Key를 발급받으세요'}
        </div>
      </div>
    </LiquidSection>
  );
}

export function STTSettingsPanelMock({
  settings,
}: {
  readonly settings: AppSettingsSnapshot;
}) {
  const selectedProvider = selectedSttProvider(settings.sttProviderType);
  const seededProviders = providers.map((provider) => ({
    ...provider,
    selected: provider.id === selectedProvider,
    state: provider.id === selectedProvider && provider.id === 'groq' ? 'ready' as const : provider.state,
    stateCopy: provider.id === selectedProvider && provider.id === 'groq' ? 'Ready' : provider.stateCopy,
  }));
  return (
    <div className="stt-settings-mock" data-testid="stt-settings-panel-mock">
      <LiquidSection title="음성 인식 엔진">
        <div className="stt-provider-list" role="radiogroup" aria-label="STT provider mock selector">
          {seededProviders.map((provider) => <ProviderRow provider={provider} key={provider.id} />)}
        </div>
      </LiquidSection>

      {selectedProvider === 'groq' ? <ApiKeySection configured={settings.groqApiKeyConfigured} /> : null}

      <LiquidSection title="무음 자동 스킵">
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
      </LiquidSection>
    </div>
  );
}

function selectedSttProvider(provider: STTProviderType): ProviderModel['id'] {
  if (provider === 'groq' || provider === 'mlx-audio' || provider === 'whisperkit') return provider;
  return 'whisperkit';
}

export default STTSettingsPanelMock;
