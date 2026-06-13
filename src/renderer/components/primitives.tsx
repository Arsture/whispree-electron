import type { CSSProperties, ReactNode } from 'react';
import type { BadgeTone } from '../ui-model';

export type StatusBadgeStyle = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type CompatibilityGrade = 'RUNS GREAT' | 'RUNS WELL' | 'DECENT' | 'TIGHT FIT' | 'BARELY RUNS' | 'TOO HEAVY';
export type PermissionStatus = 'granted' | 'denied' | 'notDetermined' | 'unavailable';
export type SurfaceRole = 'card' | 'inset' | 'editor' | 'overlay';

const statusToneByStyle: Record<StatusBadgeStyle, BadgeTone> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'accent',
  neutral: 'neutral',
};

const compatibilityToneByGrade: Record<CompatibilityGrade, BadgeTone> = {
  'RUNS GREAT': 'neutral',
  'RUNS WELL': 'neutral',
  DECENT: 'neutral',
  'TIGHT FIT': 'warning',
  'BARELY RUNS': 'danger',
  'TOO HEAVY': 'danger',
};

function isWarningRam(percent: number): boolean {
  return percent >= 75 && percent < 90;
}

function isDangerRam(percent: number): boolean {
  return percent >= 90;
}

function isWarningQuality(score: number): boolean {
  return score <= 35 && score > 15;
}

function isDangerQuality(score: number): boolean {
  return score <= 15;
}

function metricTone(props: { readonly ramPercent?: number; readonly qualityScore?: number }): BadgeTone | undefined {
  if (props.ramPercent !== undefined) {
    if (isDangerRam(props.ramPercent)) return 'danger';
    if (isWarningRam(props.ramPercent)) return 'warning';
  }
  if (props.qualityScore !== undefined) {
    if (isDangerQuality(props.qualityScore)) return 'danger';
    if (isWarningQuality(props.qualityScore)) return 'warning';
  }
  return undefined;
}

export function LiquidSection({
  title,
  children,
  surfaceRole = 'card',
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly surfaceRole?: SurfaceRole;
}) {
  return (
    <section className="liquid-section" data-surface-role={surfaceRole}>
      <h2 className="liquid-section-title">{title}</h2>
      <div className="liquid-section-body liquid-surface" data-surface-role={surfaceRole}>
        {children}
      </div>
    </section>
  );
}

export function SettingsCard({
  title,
  description,
  children,
  surfaceRole = 'card',
}: {
  readonly title?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly surfaceRole?: SurfaceRole;
}) {
  return (
    <section className="settings-card liquid-surface" data-surface-role={surfaceRole}>
      {title ? (
        <header className="settings-card-header">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  icon,
  trailing,
  children,
}: {
  readonly label: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly trailing?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <div className="settings-row">
      {icon ? <span className="settings-row-icon" aria-hidden="true">{icon}</span> : null}
      <div className="settings-row-copy">
        <span className="settings-row-label">{label}</span>
        {description ? <span className="settings-row-description">{description}</span> : null}
        {children}
      </div>
      {trailing ? <div className="settings-row-trailing">{trailing}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  text,
  icon,
  style = 'neutral',
}: {
  readonly children?: ReactNode;
  readonly text?: string;
  readonly icon?: ReactNode;
  readonly style?: StatusBadgeStyle;
}) {
  const tone = statusToneByStyle[style];
  return (
    <span className="status-badge" data-tone={tone} data-style={style}>
      {icon ? <span className="status-badge-icon" aria-hidden="true">{icon}</span> : null}
      <span>{children ?? text}</span>
    </span>
  );
}

export function StatusPill({ children, tone, status }: { readonly children: ReactNode; readonly tone: BadgeTone; readonly status?: string }) {
  return (
    <span className="status-pill status-badge" data-tone={tone} data-status={status ?? tone}>
      {children}
    </span>
  );
}

export function CompatibilityBadge({ grade }: { readonly grade: CompatibilityGrade }) {
  return (
    <span className="compatibility-badge" data-tone={compatibilityToneByGrade[grade]} data-grade={grade}>
      {grade}
    </span>
  );
}

export function MetricLabel({ icon, text, tone }: { readonly icon: ReactNode; readonly text: string; readonly tone?: BadgeTone }) {
  return (
    <span className="metric-label" data-tone={tone ?? 'secondary'}>
      <span className="metric-label-icon" aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

export function ModelMetrics({
  sizeText,
  ramPercent,
  tokPerSec,
  latencyMs,
  qualityScore,
  grade,
}: {
  readonly sizeText: string;
  readonly ramPercent?: number;
  readonly tokPerSec?: number;
  readonly latencyMs?: number;
  readonly qualityScore: number;
  readonly grade: CompatibilityGrade;
}) {
  const speedText = tokPerSec !== undefined && tokPerSec > 0 ? `${tokPerSec} tok/s` : latencyMs !== undefined ? `${latencyMs}ms` : undefined;
  return (
    <div className="model-metrics">
      <CompatibilityBadge grade={grade} />
      <div className="model-metric-row">
        <MetricLabel icon="◫" text={sizeText} />
        {ramPercent !== undefined ? <MetricLabel icon="▣" text={`RAM ${ramPercent}%`} tone={metricTone({ ramPercent })} /> : null}
        {speedText ? <MetricLabel icon={tokPerSec !== undefined && tokPerSec > 0 ? '⚡' : '⌁'} text={speedText} /> : null}
        <MetricLabel icon="▥" text={`Quality ${qualityScore}`} tone={metricTone({ qualityScore })} />
      </div>
    </div>
  );
}

export function PermissionRow({
  icon,
  title,
  subtitle,
  status,
  actionLabel,
  onAction,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly subtitle: string;
  readonly status: PermissionStatus;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  const computedActionLabel = actionLabel ?? (status === 'denied' ? '설정 열기' : '허용하기');
  return (
    <div className="permission-row" data-permission-status={status}>
      <span className="permission-row-icon" aria-hidden="true">{icon}</span>
      <div className="permission-row-copy">
        <span className="permission-row-title">{title}</span>
        <span className="permission-row-subtitle">{subtitle}</span>
      </div>
      <div className="permission-row-trailing">
        {status === 'granted' ? <span className="permission-check" aria-label="허용됨">✓</span> : null}
        {status === 'unavailable' ? <span className="permission-unavailable">미설치</span> : null}
        {status === 'denied' || status === 'notDetermined' ? (
          <button type="button" className="permission-action" onClick={onAction}>
            {computedActionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Keycap({ children }: { readonly children: ReactNode }) {
  return <kbd className="keycap">{children}</kbd>;
}

export function HotkeyBadge({ id, label, keys, active = false }: { readonly id: string; readonly label: string; readonly keys: string; readonly active?: boolean }) {
  return (
    <span className="hotkey-badge" data-hotkey={id} data-active={active}>
      <span>{label}</span>
      <Keycap>{keys}</Keycap>
    </span>
  );
}

export function Waveform({ active = false }: { readonly active?: boolean }) {
  return (
    <div className="waveform" data-active={active} aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <span key={index} style={{ '--bar': `${20 + ((index * 13) % 44)}%` } as CSSProperties} />
      ))}
    </div>
  );
}
