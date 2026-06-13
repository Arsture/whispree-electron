import { useMemo, useState } from 'react';

import '../styles/wordsets.css';

type SyncState = 'synced' | 'pending' | 'local-only';

interface CorrectionMappingMock {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly state?: 'editing' | 'new' | 'removed';
}

interface WordMock {
  readonly id: string;
  readonly value: string;
  readonly state?: 'editing' | 'new' | 'removed';
}

interface DomainWordSetMock {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly syncState: SyncState;
  readonly words: readonly WordMock[];
  readonly corrections: readonly CorrectionMappingMock[];
}

interface DefaultSetMock {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly alreadyAdded: boolean;
}

const defaultWordSets: readonly DomainWordSetMock[] = [
  {
    id: 'it-dev',
    name: 'IT/개발',
    enabled: true,
    syncState: 'synced',
    words: [
      { id: 'api', value: 'API' },
      { id: 'react', value: 'React' },
      { id: 'docker', value: 'Docker' },
      { id: 'llm', value: 'LLM' },
      { id: 'vector-db', value: 'Vector DB', state: 'editing' },
      { id: 'rag', value: 'RAG', state: 'new' },
    ],
    corrections: [
      { id: 'gpt', from: '지피티', to: 'GPT' },
      { id: 'kubernetes', from: '쿠버네티스', to: 'Kubernetes' },
      { id: 'local-llm', from: '로컬 엘엘엠', to: 'local LLM', state: 'editing' },
    ],
  },
  {
    id: 'statistics',
    name: '통계/논문',
    enabled: true,
    syncState: 'pending',
    words: [
      { id: 'p-value', value: 'p-value' },
      { id: 'anova', value: 'ANOVA' },
      { id: 'bayes', value: 'Bayesian' },
      { id: 't-dist', value: 'T-distribution' },
    ],
    corrections: [
      { id: 'pvalue', from: '피 밸류', to: 'p-value' },
      { id: 'anova-ko', from: '아노바', to: 'ANOVA', state: 'new' },
    ],
  },
  {
    id: 'custom',
    name: '내 프로젝트 용어',
    enabled: false,
    syncState: 'local-only',
    words: [
      { id: 'whispree', value: 'Whispree' },
      { id: 'codex-style', value: 'Codex-style' },
      { id: 'old-token', value: 'legacy prompt', state: 'removed' },
    ],
    corrections: [],
  },
];

const defaultSets: readonly DefaultSetMock[] = [
  {
    id: 'default-it-dev',
    name: 'IT/개발',
    description: 'API, React, Docker, LLM 등 개발 용어 30개',
    alreadyAdded: true,
  },
  {
    id: 'default-statistics',
    name: '통계/논문',
    description: 'T-distribution, p-value, ANOVA 등 통계 용어 24개',
    alreadyAdded: true,
  },
  {
    id: 'default-custom',
    name: '사용자 지정',
    description: '직접 단어를 추가할 수 있는 빈 세트',
    alreadyAdded: false,
  },
];

function syncCopy(state: SyncState): string {
  if (state === 'synced') return '사전 동기화됨';
  if (state === 'pending') return '동기화 대기';
  return '로컬 편집 중';
}

function syncIcon(state: SyncState): string {
  if (state === 'synced') return '✓';
  if (state === 'pending') return '↻';
  return '●';
}

function DomainToggle({ checked }: { readonly checked: boolean }) {
  return (
    <span className="wordsets-switch" data-checked={checked} role="switch" aria-checked={checked} tabIndex={0}>
      <span aria-hidden="true" />
    </span>
  );
}

function WordChip({ word }: { readonly word: WordMock }) {
  return (
    <span className="wordsets-chip" data-state={word.state ?? 'saved'}>
      <span className="wordsets-chip-text">{word.value}</span>
      {word.state === 'editing' ? <span className="wordsets-edit-cursor" aria-label="편집 중" /> : null}
      {word.state === 'removed' ? <span className="wordsets-chip-delete" aria-hidden="true">−</span> : <span className="wordsets-chip-delete" aria-hidden="true">×</span>}
    </span>
  );
}

function CorrectionRow({ correction }: { readonly correction: CorrectionMappingMock }) {
  return (
    <div className="wordsets-correction-row" data-state={correction.state ?? 'saved'}>
      <code>{correction.from}</code>
      <span aria-hidden="true">→</span>
      <code>{correction.to}</code>
      <span className="wordsets-correction-spacer" />
      {correction.state ? <em>{correction.state === 'editing' ? '편집 중' : correction.state === 'new' ? '추가됨' : '삭제 예정'}</em> : null}
      <button type="button" aria-label={`${correction.from} 매핑 삭제`}>
        −
      </button>
    </div>
  );
}

function AddWordMock({ wordSetId }: { readonly wordSetId: string }) {
  const placeholder = wordSetId === 'custom' ? '새 단어 추가' : '도메인 단어 추가';

  return (
    <div className="wordsets-add-row" aria-label="word add mock">
      <span className="wordsets-textfield">{placeholder}</span>
      <button type="button" aria-label="단어 추가" data-enabled={wordSetId === 'it-dev'}>
        +
      </button>
    </div>
  );
}

function AddCorrectionMock() {
  return (
    <div className="wordsets-correction-add-row" aria-label="correction add mock">
      <span className="wordsets-textfield">잘못된 표현</span>
      <span aria-hidden="true">→</span>
      <span className="wordsets-textfield">올바른 단어</span>
      <button type="button" aria-label="교정 매핑 추가">+</button>
    </div>
  );
}

function WordSetSection({ wordSet, expanded }: { readonly wordSet: DomainWordSetMock; readonly expanded: boolean }) {
  return (
    <section className="wordsets-domain-card" data-enabled={wordSet.enabled} data-expanded={expanded}>
      <header className="wordsets-domain-header">
        <DomainToggle checked={wordSet.enabled} />
        <button type="button" className="wordsets-domain-title" aria-expanded={expanded}>
          <strong>{wordSet.name}</strong>
          <span>
            {wordSet.words.filter((word) => word.state !== 'removed').length}개 단어
            {wordSet.corrections.length > 0 ? ` · ${wordSet.corrections.length}개 매핑` : ''}
          </span>
        </button>
        <span className="wordsets-sync-badge" data-state={wordSet.syncState}>
          <span aria-hidden="true">{syncIcon(wordSet.syncState)}</span>
          {syncCopy(wordSet.syncState)}
        </span>
        <button type="button" className="wordsets-chevron" aria-label={`${wordSet.name} 펼치기`}>
          {expanded ? '⌃' : '⌄'}
        </button>
      </header>

      {expanded ? (
        <div className="wordsets-domain-body">
          <div className="wordsets-field-group">
            <div className="wordsets-group-label">
              <strong>단어</strong>
              <span>STT + LLM</span>
            </div>
            {wordSet.words.length > 0 ? (
              <div className="wordsets-chip-cloud" aria-label={`${wordSet.name} 단어 목록`}>
                {wordSet.words.map((word) => <WordChip word={word} key={word.id} />)}
              </div>
            ) : (
              <p className="wordsets-empty-copy">단어가 없습니다.</p>
            )}
            <AddWordMock wordSetId={wordSet.id} />
          </div>

          <div className="wordsets-field-group">
            <div className="wordsets-group-label">
              <strong>교정 매핑</strong>
              <span>LLM only</span>
            </div>
            {wordSet.corrections.length > 0 ? (
              <div className="wordsets-correction-list">
                {wordSet.corrections.map((correction) => <CorrectionRow correction={correction} key={correction.id} />)}
              </div>
            ) : (
              <p className="wordsets-empty-copy">교정 매핑이 없습니다.</p>
            )}
            <AddCorrectionMock />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function DomainWordSetsPanelMock() {
  const [expandedIds] = useState<ReadonlySet<string>>(() => new Set(['it-dev', 'statistics', 'custom']));
  const syncSummary = useMemo(() => {
    const totalWords = defaultWordSets.reduce((sum, set) => sum + set.words.filter((word) => word.state !== 'removed').length, 0);
    const totalMappings = defaultWordSets.reduce((sum, set) => sum + set.corrections.filter((correction) => correction.state !== 'removed').length, 0);
    return { totalWords, totalMappings };
  }, []);

  return (
    <div className="wordsets-panel-mock" data-testid="domain-wordsets-panel-mock">
      <div className="wordsets-guidance">
        <div>
          <p>도메인 단어 세트</p>
          <span>도메인별 단어 세트를 활성화하면 음성 인식과 교정 단계에서 해당 단어들이 더 정확하게 처리됩니다.</span>
        </div>
        <div className="wordsets-sync-summary" aria-label="dictionary sync visual state">
          <span aria-hidden="true">⇄</span>
          <strong>Dictionary Sync</strong>
          <small>{syncSummary.totalWords} words · {syncSummary.totalMappings} mappings · 1 pending</small>
        </div>
      </div>

      <div className="wordsets-domain-list">
        {defaultWordSets.map((wordSet) => (
          <WordSetSection wordSet={wordSet} expanded={expandedIds.has(wordSet.id)} key={wordSet.id} />
        ))}
      </div>

      <section className="wordsets-default-section">
        <h2>기본 세트 추가</h2>
        <div className="wordsets-default-list">
          {defaultSets.map((set, index) => (
            <div className="wordsets-default-row" key={set.id}>
              {index > 0 ? <span className="wordsets-row-divider" aria-hidden="true" /> : null}
              <div>
                <strong>{set.name}</strong>
                <span>{set.description}</span>
              </div>
              {set.alreadyAdded ? (
                <span className="wordsets-added-badge"><span aria-hidden="true">✓</span>추가됨</span>
              ) : (
                <button type="button">추가</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
