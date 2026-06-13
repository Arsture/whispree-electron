import type { AppSnapshot, PermissionCardSnapshot, ProviderCardSnapshot, QueueItemSnapshot } from '../../shared/ipc';
import { emptyTargetContextSnapshot } from '../../shared/context';
import { jobLabel, queueProcessingText, statusTitle, statusTone } from '../ui-model';
import { StatusPill, Waveform } from '../components/primitives';
import { TranscriptionOverlayMock } from './TranscriptionOverlayMock';
import { OnboardingMock } from './onboarding/OnboardingMock';
import { QuickFixMock } from './quickfix/QuickFixMock';
import { ScreenshotSelectionMock } from './ScreenshotSelectionMock';
import { MenuBarMock } from './menubar/MenuBarMock';

const screenshotMocks = [
  { id: 'screen-1', appName: 'Safari', timestamp: '10:42:18', tone: 'blue' },
  { id: 'screen-2', appName: 'Xcode', timestamp: '10:42:22', tone: 'purple' },
  { id: 'screen-3', appName: 'Terminal', timestamp: '10:42:26', tone: 'green' },
] as const;

function count(snapshot: AppSnapshot, key: 'total' | 'processing' | 'ready' | 'history'): number {
  switch (key) {
    case 'total':
      return snapshot.queue.totalCount;
    case 'processing':
      return snapshot.queue.processingCount;
    case 'ready':
      return snapshot.queue.deliveryReadyCount;
    case 'history':
      return snapshot.history.length;
  }
}

function RecordingStatus({ snapshot }: { readonly snapshot: AppSnapshot }) {
  const isBusy = snapshot.recording.active || snapshot.appStatus === 'processing';
  const copy = snapshot.recording.active ? 'Listening... (ESC to cancel)' : 'Press hotkey to start recording';

  return (
    <section className="liquid-card recording-card home-recording-card" data-testid="recording-status" data-app-status={snapshot.appStatus}>
      <div className="swift-recording-center">
        <span className="swift-recording-mic" data-active={isBusy} aria-hidden="true" />
        <p>{copy}</p>
      </div>
    </section>
  );
}

function ActionDock({ snapshot }: { readonly snapshot: AppSnapshot }) {
  const isRealRecordingActive = snapshot.recording.active && snapshot.recording.mode === 'real';
  return (
    <section className="home-action-dock" aria-label="Recording controls">
      <button type="button" disabled={snapshot.recording.active} onClick={() => void window.whispree.enqueueMockDictation()}>Start mock recording</button>
      <button type="button" onClick={() => void (isRealRecordingActive ? window.whispree.stopRealRecording() : window.whispree.startRealRecording())}>
        {isRealRecordingActive ? 'Stop real recording' : 'Start real recording'}
      </button>
      <button type="button" onClick={() => void window.whispree.cancelForegroundJob()}>Cancel foreground</button>
    </section>
  );
}

function AccessibilityWarning({ permissions }: { readonly permissions: readonly PermissionCardSnapshot[] }) {
  const accessibility = permissions.find((permission) => permission.kind === 'accessibility');
  if (accessibility?.state === 'granted') return null;

  return (
    <section className="accessibility-warning" data-testid="accessibility-warning" aria-label="Accessibility permission warning">
      <span className="warning-icon" aria-hidden="true">⚠</span>
      <span>
        <strong>Accessibility 권한 필요</strong>
        <small>텍스트 자동 삽입에 손쉬운 사용 권한이 필요합니다</small>
      </span>
      <button type="button" disabled>허용</button>
    </section>
  );
}

function PermissionsPanel({ permissions }: { readonly permissions: readonly PermissionCardSnapshot[] }) {
  return (
    <section className="liquid-card permissions-panel" data-testid="permissions">
      <div className="card-heading">
        <h2>Permissions</h2>
        <StatusPill tone="warning">OS-gated</StatusPill>
      </div>
      <div className="permission-row-list">
        {permissions.map((permission) => (
          <article className="permission-row" data-permission-kind={permission.kind} data-permission-state={permission.state} key={permission.kind}>
            <span className="permission-row-icon" aria-hidden="true">{permission.state === 'granted' ? '✓' : '!'}</span>
            <span className="permission-row-copy">
              <strong>{permission.label}</strong>
              <small>{permission.detail}</small>
            </span>
            <button type="button" onClick={() => void window.whispree.requestPermission(permission.kind)}>
              Request {permission.label}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function LatestTranscription({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <section className="liquid-card latest-card" data-testid="latest-transcription">
      <div className="card-heading">
        <h2>Last Transcription</h2>
        {snapshot.latest ? <StatusPill tone="success">delivered</StatusPill> : <StatusPill tone="neutral">empty</StatusPill>}
      </div>
      {snapshot.latest ? (
        <div className="text-wells transcription-wells">
          <div>
            <span>STT Result</span>
            <p>{snapshot.latest.originalText}</p>
          </div>
          <div>
            <span>LLM Corrected</span>
            <p>{snapshot.latest.correctedText}</p>
          </div>
        </div>
      ) : (
        <p className="empty-copy">아직 녹음 없음 — 핫키를 눌러 녹음을 시작하세요</p>
      )}
    </section>
  );
}

function ScreenshotStrip() {
  return (
    <section className="liquid-card screenshot-strip" data-testid="screenshot-strip">
      <div className="screenshot-strip-heading">
        <span aria-hidden="true">▣</span>
        <h2>스크린 컨텍스트</h2>
        <small>{screenshotMocks.length}장</small>
      </div>
      <div className="screenshot-scroll" aria-label="Screenshot context thumbnails">
        {screenshotMocks.map((screenshot) => (
          <article className="screenshot-thumb" data-tone={screenshot.tone} key={screenshot.id}>
            <div className="screenshot-image" aria-hidden="true">
              <span />
            </div>
            <strong>{screenshot.appName}</strong>
            <small>{screenshot.timestamp}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProviderStatusCards({ providers }: { readonly providers: readonly ProviderCardSnapshot[] }) {
  const stt = providers.find((provider) => provider.family === 'stt') ?? providers[0];
  const llm = providers.find((provider) => provider.family === 'llm') ?? providers.find((provider) => provider.family === 'cloud-backend');

  const cards = [
    { id: 'stt', title: 'STT', icon: 'mic', provider: stt, picker: 'Groq Cloud (빠름)', subcopy: null },
    { id: 'llm', title: 'LLM', icon: 'globe', provider: llm, picker: 'OpenAI (GPT)', subcopy: 'GPT-5.5 (Latest)' },
  ] as const;

  return (
    <section className="liquid-card provider-section" data-testid="providers">
      <h2>Providers</h2>
      <p className="provider-status-copy">provider status</p>
      <div className="provider-card-stack">
        {cards.map((card) => (
          <article className="provider-card" data-provider-family={card.id} key={card.id}>
            <div className="provider-main-row">
              <span className="provider-icon" data-provider-icon={card.icon} aria-hidden="true" />
              <span className="provider-title-stack">
                <strong>{card.title}</strong>
                {card.subcopy ? <small>{card.subcopy}</small> : null}
              </span>
              <span className="provider-picker" aria-label={`${card.title} selected provider`}>
                {card.picker}
                <span className="provider-picker-chevron" aria-hidden="true">⌄</span>
              </span>
              {card.provider ? (
                <StatusPill tone="success" status={card.provider.status}>
                  Ready
                </StatusPill>
              ) : null}
            </div>
            <p>{card.provider?.detail ?? 'Provider configuration is not ready yet.'}</p>
            {card.id === 'stt' && card.provider?.status !== 'implemented' ? (
              <small className="provider-warning">STT 설정에서 Groq API Key를 입력하세요</small>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function QueueSummary({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <section className="liquid-card queue-summary-card" data-testid="queue-summary">
      <div className="card-heading">
        <h2>Queue</h2>
        <StatusPill tone="accent">FIFO</StatusPill>
      </div>
      <div className="count-grid queue-count-grid">
        {(['total', 'processing', 'ready', 'history'] as const).map((key) => (
          <div className="count-tile" key={key}>
            <span>{key}</span>
            <strong data-count={key}>{count(snapshot, key)}</strong>
          </div>
        ))}
      </div>
      <p className="caption">{queueProcessingText(snapshot)}</p>
    </section>
  );
}

function QueueCards({ jobs }: { readonly jobs: readonly QueueItemSnapshot[] }) {
  const queueJobs = jobs.length > 0 ? jobs : [
    {
      id: 'mock-queue-empty',
      sequence: 1,
      status: 'queued',
      originalText: '',
      correctedText: '',
      targetContext: emptyTargetContextSnapshot,
      targetContextId: null,
      screenshotIds: [],
      isDeliverable: false,
      isProcessing: false,
      isTerminal: false,
    } satisfies QueueItemSnapshot,
  ];

  return (
    <section className="liquid-card queue-list-card" data-testid="queue-list">
      <div className="card-heading">
        <h2>Queue cards</h2>
        <StatusPill tone="neutral">calm counts</StatusPill>
      </div>
      <ol className="queue-card-list">
        {queueJobs.map((job) => (
          <li key={job.id} data-sequence={job.sequence} data-status={job.status} data-terminal={job.isTerminal}>
            <span>{jobLabel(job)}</span>
            <small>{job.correctedText || job.originalText || 'waiting for provider'}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OverlayPlaceholder() {
  return (
    <aside className="overlay-placeholder" data-testid="transcription-overlay" aria-label="Transcription overlay integration placeholder">
      <div className="card-heading">
        <h2>Overlay</h2>
        <StatusPill tone="neutral">UI-04</StatusPill>
      </div>
      <div data-testid="overlay-waveform" className="overlay-waveform-shell" aria-hidden="true">
        <Waveform active={false} />
      </div>
      <TranscriptionOverlayMock />
      <div className="overlay-hotkeys">
        <span data-hotkey="record">record</span>
        <span data-hotkey="cancel">esc</span>
      </div>
      <p>Detailed transcription overlay mock is reserved for UI-04.</p>
    </aside>
  );
}

function ContextFoundation() {
  return (
    <section className="liquid-card context-foundation" data-testid="context-foundation">
      <div className="card-heading">
        <h2>Context</h2>
        <StatusPill tone="neutral">mock</StatusPill>
      </div>
      <div className="context-surface-grid">
        <article data-context-surface="quick-fix">
          <strong>Quick Fix</strong>
          <small>Selected text correction/register surface.</small>
        </article>
        <article data-context-surface="screenshot-selection">
          <strong>Screenshot Selection</strong>
          <small>Visual context picker and thumbnail state.</small>
        </article>
      </div>
    </section>
  );
}

function SurfaceGallery() {
  return (
    <section className="liquid-card ui-surface-gallery" data-testid="ui-surface-gallery" aria-label="Swift secondary surface UI mocks">
      <div className="card-heading">
        <h2>Swift surface gallery</h2>
        <StatusPill tone="accent">UI-11–14</StatusPill>
      </div>
      <div className="ui-surface-gallery-grid">
        <article className="ui-surface-preview-card" data-ui-surface="onboarding">
          <header><strong>Onboarding</strong><small>480×640 setup flow</small></header>
          <div className="ui-surface-preview" data-preview="onboarding"><OnboardingMock /></div>
        </article>
        <article className="ui-surface-preview-card" data-ui-surface="quick-fix">
          <header><strong>Quick Fix</strong><small>selected text popover</small></header>
          <div className="ui-surface-preview" data-preview="quickfix"><QuickFixMock /></div>
        </article>
        <article className="ui-surface-preview-card" data-ui-surface="screenshot-selection">
          <header><strong>Screenshot Selection</strong><small>visual context picker</small></header>
          <div className="ui-surface-preview" data-preview="screenshot"><ScreenshotSelectionMock /></div>
        </article>
        <article className="ui-surface-preview-card" data-ui-surface="menubar">
          <header><strong>Menu Bar</strong><small>320px popover</small></header>
          <div className="ui-surface-preview" data-preview="menubar"><MenuBarMock /></div>
        </article>
      </div>
    </section>
  );
}

export function HomePanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <div className="home-grid home-dashboard">
      <header className="dashboard-header home-dashboard-header">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">≋</span>
          <div>
            <h1>Whispree</h1>
            <p aria-live="polite">{statusTitle(snapshot)}</p>
          </div>
        </div>
        <span className="dashboard-status-dot" data-tone={statusTone(snapshot)} aria-label={`Status: ${snapshot.appStatus}`} />
      </header>
      <div className="home-header-divider" aria-hidden="true" />
      {snapshot.currentError ? <p className="error-banner home-hidden-support" data-testid="home-error-diagnostics">{snapshot.currentError.message}</p> : null}
      <RecordingStatus snapshot={snapshot} />
      <AccessibilityWarning permissions={snapshot.permissions} />
      <ProviderStatusCards providers={snapshot.providers} />
      <div className="home-hidden-support" aria-label="Home support surfaces retained for IPC and UI parity tests">
        <ActionDock snapshot={snapshot} />
        <ScreenshotStrip />
        <PermissionsPanel permissions={snapshot.permissions} />
        <LatestTranscription snapshot={snapshot} />
        <QueueSummary snapshot={snapshot} />
        <QueueCards jobs={snapshot.queue.items} />
        <OverlayPlaceholder />
        <ContextFoundation />
        <SurfaceGallery />
      </div>
    </div>
  );
}
