import { useEffect, useMemo, useState } from 'react';
import { initialAppSnapshot, type AppSnapshot, type PermissionCardSnapshot, type ProviderCardSnapshot, type QueueItemSnapshot } from '../shared/ipc';
import {
  SETTINGS_PLACEHOLDERS,
  SIDEBAR_SECTIONS,
  foregroundCancelLabel,
  implementationTone,
  jobLabel,
  overlayStatusText,
  queueProcessingText,
  statusTitle,
  statusTone,
  type BadgeTone,
  type PlaceholderGroup,
  type SidebarSectionDefinition,
  type SidebarSectionId,
} from './ui-model';

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

function SectionIcon({ section }: { readonly section: SidebarSectionDefinition }) {
  return (
    <span className="sidebar-icon" data-icon-tone={section.iconTone} aria-hidden="true">
      {section.icon}
    </span>
  );
}

function StatusPill({ children, tone, status }: { readonly children: React.ReactNode; readonly tone: BadgeTone; readonly status?: string }) {
  return (
    <span className="status-pill" data-tone={tone} data-status={status ?? tone}>
      {children}
    </span>
  );
}

function Keycap({ children }: { readonly children: React.ReactNode }) {
  return <kbd className="keycap">{children}</kbd>;
}

function HotkeyBadge({ id, label, keys, active = false }: { readonly id: string; readonly label: string; readonly keys: string; readonly active?: boolean }) {
  return (
    <span className="hotkey-badge" data-hotkey={id} data-active={active}>
      <span>{label}</span>
      <Keycap>{keys}</Keycap>
    </span>
  );
}

function Waveform({ active = false }: { readonly active?: boolean }) {
  return (
    <div className="waveform" data-active={active} aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <span key={index} style={{ '--bar': `${20 + ((index * 13) % 44)}%` } as React.CSSProperties} />
      ))}
    </div>
  );
}

function RecordingStatus({ snapshot }: { readonly snapshot: AppSnapshot }) {
  const cancelLabel = foregroundCancelLabel(snapshot);
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
              {permission.status}
            </StatusPill>
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

function HomePanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
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
    </div>
  );
}

function PlaceholderSection({ groups }: { readonly groups: readonly PlaceholderGroup[] }) {
  return (
    <div className="placeholder-grid">
      {groups.map((group) => (
        <section className="liquid-card settings-group" key={group.title}>
          <div className="card-heading">
            <h2>{group.title}</h2>
            <StatusPill tone={implementationTone(group.status)} status={group.status}>{group.status}</StatusPill>
          </div>
          <ul className="settings-row-list">
            {group.rows.map((row) => (
              <li key={row}>
                <span>{row}</span>
                <small>planned adapter boundary</small>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function HistoryPanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
  return (
    <div className="history-panel">
      <header className="section-header">
        <h1>기록</h1>
        <button type="button" className="plain-action" disabled={snapshot.history.length === 0}>Clear All</button>
      </header>
      {snapshot.history.length === 0 ? (
        <section className="liquid-card empty-state">
          <h2>No Transcriptions Yet</h2>
          <p>Your transcription history will appear here.</p>
        </section>
      ) : (
        <ol className="history-list">
          {snapshot.history.map((record) => (
            <li className="liquid-card" key={record.id}>
              <div className="history-meta">
                <span>{new Date(record.deliveredAtIso).toLocaleTimeString()}</span>
                <span>
                  <button type="button" className="inline-button">원본</button>
                  <button type="button" className="inline-button">교정</button>
                </span>
              </div>
              <p>{record.correctedText || record.originalText}</p>
              {record.correctedText && record.correctedText !== record.originalText ? <small>Original: {record.originalText}</small> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PanelContent({ sectionId, snapshot }: { readonly sectionId: SidebarSectionId; readonly snapshot: AppSnapshot }) {
  if (sectionId === 'home') return <HomePanel snapshot={snapshot} />;
  if (sectionId === 'history') return <HistoryPanel snapshot={snapshot} />;
  return <PlaceholderSection groups={SETTINGS_PLACEHOLDERS[sectionId]} />;
}

export function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(initialAppSnapshot);
  const [activeSection, setActiveSection] = useState<SidebarSectionId>('home');
  const [visitedSections, setVisitedSections] = useState<ReadonlySet<SidebarSectionId>>(() => new Set(['home']));
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void window.whispree.getAppSnapshot().then((nextSnapshot) => {
      if (mounted) setSnapshot(nextSnapshot);
    });
    const unsubscribe = window.whispree.subscribeAppSnapshot((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const visited = useMemo(() => new Set(visitedSections), [visitedSections]);

  function selectSection(sectionId: SidebarSectionId) {
    setVisitedSections((current) => new Set([...current, sectionId]));
    setActiveSection(sectionId);
  }

  return (
    <main className="app-shell" data-view="whispree-shell" data-app-status={snapshot.appStatus} data-sidebar-collapsed={isSidebarCollapsed}>
      <aside className="sidebar" data-collapsed={isSidebarCollapsed} aria-label="Whispree sections">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          ◫
        </button>
        <nav role="tablist" aria-label="Whispree tabs" className="sidebar-tabs">
          {SIDEBAR_SECTIONS.map((section) => (
            <button
              type="button"
              role="tab"
              key={section.id}
              id={`tab-${section.id}`}
              aria-selected={activeSection === section.id}
              aria-controls={`panel-${section.id}`}
              data-tab={section.id}
              data-selected={activeSection === section.id}
              data-icon-tone={section.iconTone}
              className="sidebar-tab"
              onClick={() => selectSection(section.id)}
            >
              <SectionIcon section={section} />
              <span className="sidebar-label">{isSidebarCollapsed ? section.shortLabel : section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="detail-shell">
        <div className="titlebar-spacer" aria-hidden="true" />
        {SIDEBAR_SECTIONS.map((section) => {
          const isVisited = visited.has(section.id);
          const isActive = activeSection === section.id;
          if (!isVisited) return null;
          return (
            <section
              role="tabpanel"
              id={`panel-${section.id}`}
              aria-labelledby={`tab-${section.id}`}
              data-panel={section.id}
              data-active={isActive}
              data-visited="true"
              hidden={!isActive}
              className="detail-panel"
              key={section.id}
            >
              <PanelContent sectionId={section.id} snapshot={snapshot} />
            </section>
          );
        })}
      </section>
    </main>
  );
}
