import { useEffect, useState } from 'react';
import type { AppSnapshot, QueueItemSnapshot } from '../shared/ipc';

function statusTitle(snapshot: AppSnapshot | null): string {
  if (!snapshot) return 'Loading Whispree shell';
  if (snapshot.recording.active) return snapshot.recording.label;
  if ((snapshot.queue.processingCount ?? 0) > 0) return 'Mock FIFO pipeline is processing';
  if (snapshot.history.length > 0) return 'Mock dictation delivered to history';
  return 'Ready — mock scaffold only';
}

function jobLabel(job: QueueItemSnapshot): string {
  return `#${job.sequence} · ${job.status}`;
}

export function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);

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

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Whispree Electron Migration</p>
        <h1>{statusTitle(snapshot)}</h1>
        <p className="hero-copy">
          Main owns the mock recording pipeline and adapter boundary. Preload exposes only
          <code> window.whispree</code>. React renders queue/provider/permission snapshots without
          direct Electron, Node, STT, LLM, audio, or OS automation imports.
        </p>
        <div className="actions">
          <button type="button" onClick={() => void window.whispree.enqueueMockDictation()}>
            Enqueue mock dictation
          </button>
          <button type="button" className="secondary" onClick={() => void window.whispree.cancelForegroundJob()}>
            Cancel foreground scope
          </button>
        </div>
      </section>

      <section className="grid grid-three">
        <article className="card">
          <h2>Queue projection</h2>
          <dl>
            <div>
              <dt>Total</dt>
              <dd>{snapshot?.queue.totalCount ?? 0}</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>{snapshot?.queue.processingCount ?? 0}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{snapshot?.queue.deliveryReadyCount ?? 0}</dd>
            </div>
            <div>
              <dt>History</dt>
              <dd>{snapshot?.history.length ?? 0}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <h2>Latest mock output</h2>
          {snapshot?.latest ? (
            <div className="latest-grid">
              <div>
                <span>Original</span>
                <p>{snapshot.latest.originalText}</p>
              </div>
              <div>
                <span>Corrected</span>
                <p>{snapshot.latest.correctedText}</p>
              </div>
            </div>
          ) : (
            <p className="muted">No delivered mock dictation yet.</p>
          )}
        </article>

        <article className="card">
          <h2>Queue items</h2>
          {snapshot && snapshot.queue.items.length > 0 ? (
            <ol className="job-list">
              {snapshot.queue.items.map((job) => (
                <li key={job.id} data-terminal={job.isTerminal}>
                  <span>{jobLabel(job)}</span>
                  <small>{job.correctedText || job.originalText || 'waiting for mock provider'}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Queue is empty.</p>
          )}
        </article>
      </section>

      <section className="grid grid-two">
        <article className="card">
          <h2>Provider readiness</h2>
          <ul className="status-list">
            {(snapshot?.providers ?? []).map((provider) => (
              <li key={provider.id}>
                <span>
                  {provider.label}
                  <small>{provider.detail}</small>
                </span>
                <strong data-status={provider.status}>{provider.status}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Permission adapters</h2>
          <ul className="status-list">
            {(snapshot?.permissions ?? []).map((permission) => (
              <li key={permission.kind}>
                <span>
                  {permission.label}
                  <small>{permission.detail}</small>
                </span>
                <strong data-status={permission.status}>{permission.status}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
