import type { AppSnapshot } from '../../shared/ipc';

export function HistoryPanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
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
                  <button type="button" className="inline-button" onClick={() => void window.whispree.copyHistoryText(record.id, 'original')}>원본</button>
                  <button type="button" className="inline-button" onClick={() => void window.whispree.copyHistoryText(record.id, 'corrected')}>교정</button>
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
