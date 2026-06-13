import { useEffect, useState } from 'react';
import type { AppSnapshot } from '../shared/ipc';

function statusTitle(snapshot: AppSnapshot | null): string {
  if (!snapshot) return 'Loading Whispree shell';
  if (snapshot.recording.active) return snapshot.recording.label;
  return 'Ready — mock scaffold only';
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
          First milestone shell: Electron main owns native boundaries, preload exposes a typed API,
          and React renders state only. Real AI, audio, insertion, Windows execution, and release CI
          are deliberately deferred.
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

      <section className="grid">
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
              <dt>Terminal</dt>
              <dd>{snapshot?.queue.terminalCount ?? 0}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <h2>Provider readiness</h2>
          <ul className="status-list">
            {(snapshot?.providers ?? []).map((provider) => (
              <li key={provider.id}>
                <span>{provider.label}</span>
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
                <span>{permission.label}</span>
                <strong data-status={permission.status}>{permission.status}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
