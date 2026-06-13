import type { AppSnapshot, PermissionCardSnapshot, ProviderCardSnapshot, QueueItemSnapshot } from '../../shared/ipc';
import { foregroundCancelLabel, implementationTone, jobLabel, overlayStatusText, queueProcessingText, statusTitle, statusTone } from '../ui-model';
import { HotkeyBadge, Keycap, StatusPill, Waveform } from '../components/primitives';

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
  const cancelLabel = foregroundCancelLabel(snapshot);
  const realRecordingActive = snapshot.recording.active && snapshot.recording.mode === 'real';
  return (
    <section className="liquid-card recording-card" data-testid="recording-status" data-app-status={snapshot.appStatus}>
      <div className="recording-copy">
        <span className="recording-icon" data-tone={statusTone(snapshot)} aria-hidden="true">
          {snapshot.recording.active ? '●' : snapshot.appStatus === 'processing' ? '◌' : '◎'}
        </span>
        <div>
          <h2>Recording</h2>
          <p>{snapshot.recording.active ? 'Listening... (ESC to cancel)' : queueProcessingText(snapshot)}</p>
        </div>
      </div>
      <Waveform active={snapshot.recording.active || snapshot.appStatus === 'processing'} />
      <div className="recording-actions">
        <button type="button" className="primary-action" onClick={() => void window.whispree.enqueueMockDictation()}>
          Start mock recording
        </button>
        <button
          type="button"
          className="plain-action"
          onClick={() => void (realRecordingActive ? window.whispree.stopRealRecording() : window.whispree.startRealRecording())}
        >
          {realRecordingActive ? 'Stop real recording' : 'Start real recording'}
        </button>
        <button type="button" className="plain-action" onClick={() => void window.whispree.cancelForegroundJob()}>
          {cancelLabel ?? 'Cancel foreground'} <Keycap>esc</Keycap>
        </button>
      </div>
    </section>
  );
}

function QueueSummary({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <section className="liquid-card" data-testid="queue-summary">
      <div className="card-heading">
        <h2>Queue</h2>
        <StatusPill tone="accent">FIFO</StatusPill>
      </div>
      <div className="count-grid">
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

function LatestTranscription({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <section className="liquid-card latest-card" data-testid="latest-transcription">
      <div className="card-heading">
        <h2>Latest transcription</h2>
        {snapshot.latest ? <StatusPill tone="success">delivered</StatusPill> : <StatusPill tone="neutral">empty</StatusPill>}
      </div>
      {snapshot.latest ? (
        <div className="text-wells">
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

function QueueList({ jobs }: { readonly jobs: readonly QueueItemSnapshot[] }) {
  return (
    <section className="liquid-card queue-list-card">
      <div className="card-heading">
        <h2>Queue items</h2>
        <StatusPill tone="neutral">calm counts</StatusPill>
      </div>
      <ol className="queue-list" data-testid="queue-list">
        {jobs.map((job) => (
          <li key={job.id} data-sequence={job.sequence} data-status={job.status} data-terminal={job.isTerminal}>
            <span>{jobLabel(job)}</span>
            <small>{job.correctedText || job.originalText || 'waiting for mock provider'}</small>
          </li>
        ))}
      </ol>
      {jobs.length === 0 ? <p className="empty-copy">Queue is empty.</p> : null}
    </section>
  );
}

function ProviderRows({ providers }: { readonly providers: readonly ProviderCardSnapshot[] }) {
  return (
    <section className="liquid-card" data-testid="providers">
      <div className="card-heading">
        <h2>Providers</h2>
        <StatusPill tone="neutral">mock/planned</StatusPill>
      </div>
      <ul className="status-list">
        {providers.map((provider) => (
          <li key={provider.id} data-provider-id={provider.id} data-status={provider.status}>
            <span>
              <strong>{provider.label}</strong>
              <small>{provider.detail}</small>
            </span>
            <StatusPill tone={implementationTone(provider.status)} status={provider.status}>
              {provider.status}
            </StatusPill>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PermissionRows({ permissions }: { readonly permissions: readonly PermissionCardSnapshot[] }) {
  return (
    <section className="liquid-card" data-testid="permissions">
      <div className="card-heading">
        <h2>Permissions</h2>
        <StatusPill tone="warning">adapters later</StatusPill>
      </div>
      <ul className="status-list">
        {permissions.map((permission) => (
          <li key={permission.kind} data-permission-kind={permission.kind} data-status={permission.status} data-state={permission.state}>
            <span>
              <strong>{permission.label}</strong>
              <small>{permission.detail}</small>
            </span>
            <StatusPill tone={implementationTone(permission.status)} status={permission.status}>
              {permission.state}
            </StatusPill>
            <button type="button" className="mini-action" onClick={() => void window.whispree.requestPermission(permission.kind)}>
              Request
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TranscriptionOverlay({ snapshot }: { readonly snapshot: AppSnapshot }) {
  const cancelLabel = foregroundCancelLabel(snapshot);
  return (
    <aside className="transcription-overlay" data-testid="transcription-overlay" aria-label="Transcription overlay preview">
      <div className="overlay-status-row">
        <span className="overlay-icon" data-tone={statusTone(snapshot)} aria-hidden="true">
          {snapshot.recording.active ? '●' : '◌'}
        </span>
        <span data-testid="overlay-status">{overlayStatusText(snapshot)}</span>
        {snapshot.appStatus === 'processing' ? <span className="tiny-spinner" aria-hidden="true" /> : null}
      </div>
      <div data-testid="overlay-waveform">
        <Waveform active={snapshot.recording.active || snapshot.appStatus === 'processing'} />
      </div>
      <div className="overlay-hotkeys">
        {snapshot.recording.active ? <HotkeyBadge id="stop" label="Stop" keys="⌘⇧Space" /> : null}
        <HotkeyBadge id="cancel" label={cancelLabel ?? 'Cancel'} keys="esc" />
        <HotkeyBadge id="image-attach" label="Img Attach" keys="⌥" active={false} />
      </div>
    </aside>
  );
}


function ContextFoundation() {
  return (
    <section className="liquid-card" data-testid="context-foundation">
      <div className="card-heading">
        <h2>Context & Quick Fix</h2>
        <StatusPill tone="warning">planned adapters</StatusPill>
      </div>
      <ul className="status-list">
        <li data-context-surface="screenshot-selection">
          <span><strong>Screenshot Selection</strong><small>FIFO-head-only image selection for future VLM correction.</small></span>
          <StatusPill tone="warning" status="planned">planned</StatusPill>
        </li>
        <li data-context-surface="browser-restore">
          <span><strong>Browser Restore</strong><small>Chrome tab/input context will stay job-scoped behind OS adapters.</small></span>
          <StatusPill tone="warning" status="planned">planned</StatusPill>
        </li>
        <li data-context-surface="terminal-restore">
          <span><strong>Terminal Restore</strong><small>iTerm2/tmux or Windows terminal state remains adapter-owned.</small></span>
          <StatusPill tone="neutral" status="not-tested">not-tested</StatusPill>
        </li>
        <li data-context-surface="quick-fix">
          <span><strong>Quick Fix</strong><small>Selected text correction and dictionary registration through typed IPC.</small></span>
          <StatusPill tone="warning" status="planned">planned</StatusPill>
        </li>
      </ul>
    </section>
  );
}

export function HomePanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <div className="home-grid">
      <header className="dashboard-header">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">≋</span>
          <div>
            <h1>Whispree</h1>
            <p aria-live="polite">{statusTitle(snapshot)}</p>
          </div>
        </div>
        <StatusPill tone={statusTone(snapshot)} status={snapshot.appStatus}>{snapshot.appStatus}</StatusPill>
      </header>
      {snapshot.currentError ? <p className="error-banner">{snapshot.currentError.message}</p> : null}
      <RecordingStatus snapshot={snapshot} />
      <div className="dashboard-columns">
        <QueueSummary snapshot={snapshot} />
        <LatestTranscription snapshot={snapshot} />
      </div>
      <div className="dashboard-columns wide-left">
        <QueueList jobs={snapshot.queue.items} />
        <TranscriptionOverlay snapshot={snapshot} />
      </div>
      <div className="dashboard-columns">
        <ProviderRows providers={snapshot.providers} />
        <PermissionRows permissions={snapshot.permissions} />
      </div>
      <ContextFoundation />
    </div>
  );
}
