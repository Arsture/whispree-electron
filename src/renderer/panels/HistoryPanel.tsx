import { useState } from 'react';
import type { AppSnapshot, HistoryRecordSnapshot } from '../../shared/ipc';

const RELATIVE_TIME_UNITS = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
] as const;

const relativeFormatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });

export function HistoryPanel({ snapshot }: { readonly snapshot: AppSnapshot }) {
  const hasHistory = snapshot.history.length > 0;

  return (
    <div className="history-panel">
      <header className="history-header">
        <h1>기록</h1>
        {hasHistory ? (
          <button type="button" className="history-clear-button" aria-label="전체 기록 지우기">
            Clear All
          </button>
        ) : null}
      </header>

      <div className="history-divider" role="presentation" />

      {hasHistory ? (
        <ol className="history-list" aria-label="전사 기록">
          {snapshot.history.map((record) => (
            <HistoryRow key={record.id} record={record} />
          ))}
        </ol>
      ) : (
        <section className="history-empty-state" aria-labelledby="history-empty-title">
          <div className="history-empty-icon" aria-hidden="true">􀌤</div>
          <h2 id="history-empty-title">No Transcriptions Yet</h2>
          <p>Your transcription history will appear here.</p>
        </section>
      )}
    </div>
  );
}

function HistoryRow({ record }: { readonly record: HistoryRecordSnapshot }) {
  const [isDisplayTextExpanded, setIsDisplayTextExpanded] = useState(false);
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);
  const hasCorrectedText = record.correctedText.length > 0 && record.correctedText !== record.originalText;
  const displayText = hasCorrectedText ? record.correctedText : record.correctedText || record.originalText;
  const deliveredAt = new Date(record.deliveredAtIso);
  const relativeTimestamp = formatRelativeTimestamp(deliveredAt);

  return (
    <li className="history-row">
      <div className="history-row-meta">
        <time dateTime={record.deliveredAtIso}>{relativeTimestamp}</time>
        <div className="history-copy-actions" aria-label="복사 옵션">
          {hasCorrectedText ? (
            <button
              type="button"
              className="history-copy-button history-copy-button-secondary"
              onClick={() => void window.whispree.copyHistoryText(record.id, 'original')}
              aria-label="원본 텍스트 복사"
              title="원본 텍스트 복사"
            >
              <span aria-hidden="true">􀉁</span>
              <span>원본</span>
            </button>
          ) : null}
          <button
            type="button"
            className="history-copy-button"
            onClick={() => void window.whispree.copyHistoryText(record.id, hasCorrectedText ? 'corrected' : 'original')}
            aria-label={hasCorrectedText ? '교정된 텍스트 복사' : '텍스트 복사'}
            title={hasCorrectedText ? '교정된 텍스트 복사' : '텍스트 복사'}
          >
            <span aria-hidden="true">􀉁</span>
            {hasCorrectedText ? <span>교정</span> : null}
          </button>
        </div>
      </div>

      <button
        type="button"
        className={isDisplayTextExpanded ? 'history-text-button history-display-text is-expanded' : 'history-text-button history-display-text'}
        onClick={() => setIsDisplayTextExpanded((isExpanded) => !isExpanded)}
        aria-expanded={isDisplayTextExpanded}
      >
        {displayText}
      </button>

      {hasCorrectedText ? (
        <button
          type="button"
          className={isOriginalExpanded ? 'history-text-button history-original-text is-expanded' : 'history-text-button history-original-text'}
          onClick={() => setIsOriginalExpanded((isExpanded) => !isExpanded)}
          aria-expanded={isOriginalExpanded}
        >
          Original: {record.originalText}
        </button>
      ) : null}
    </li>
  );
}

function formatRelativeTimestamp(date: Date, now = new Date()): string {
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return '방금 전';

  const elapsedSeconds = Math.round((timestamp - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(elapsedSeconds);

  if (absoluteSeconds < 45) return '방금 전';

  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    if (absoluteSeconds >= seconds) {
      return relativeFormatter.format(Math.round(elapsedSeconds / seconds), unit);
    }
  }

  return relativeFormatter.format(Math.round(elapsedSeconds / 60), 'minute');
}
