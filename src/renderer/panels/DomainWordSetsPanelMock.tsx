import { useState } from 'react';
import type { AppSettingsSnapshot, DomainWordSet } from '../../shared/settings';

import '../styles/wordsets.css';

interface CorrectionMappingMock {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

interface DomainWordSetMock {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly words: readonly string[];
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
    words: [
      'API',
      'backend',
      'frontend',
      'React',
      'Swift',
      'Python',
      'GitHub',
      'PR',
      'merge',
      'deploy',
      'CI/CD',
      'Docker',
    ],
    corrections: [
      { id: 'gpt', from: '지피티', to: 'GPT' },
      { id: 'kubernetes', from: '쿠버네티스', to: 'Kubernetes' },
    ],
  },
  {
    id: 'statistics',
    name: '통계',
    enabled: true,
    words: [
      'T-distribution',
      'p-value',
      'regression',
      'hypothesis',
      'ANOVA',
      'chi-square',
      'correlation',
      'variance',
    ],
    corrections: [
      { id: 'pvalue', from: '피 밸류', to: 'p-value' },
      { id: 'anova-ko', from: '아노바', to: 'ANOVA' },
    ],
  },
  {
    id: 'custom',
    name: '사용자 정의',
    enabled: true,
    words: [],
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
    name: '통계',
    description: 'T-distribution, p-value, ANOVA 등 통계 용어 24개',
    alreadyAdded: true,
  },
  {
    id: 'default-custom',
    name: '사용자 정의',
    description: '직접 단어를 추가할 수 있는 빈 세트',
    alreadyAdded: true,
  },
];

function DomainToggle({ checked }: { readonly checked: boolean }) {
  return (
    <span className="wordsets-switch" data-checked={checked} role="switch" aria-checked={checked} tabIndex={0}>
      <span aria-hidden="true" />
    </span>
  );
}

function WordRow({ word, label }: { readonly word: string; readonly label: string }) {
  return (
    <div className="wordsets-word-row">
      <span className="wordsets-textfield" aria-label={label}>{word}</span>
      <button type="button" aria-label={`${word} 삭제`}>
        −
      </button>
    </div>
  );
}

function CorrectionRow({ correction }: { readonly correction: CorrectionMappingMock }) {
  return (
    <div className="wordsets-correction-row">
      <code>{correction.from}</code>
      <span className="wordsets-correction-arrow" aria-hidden="true">→</span>
      <code>{correction.to}</code>
      <span className="wordsets-correction-spacer" />
      <button type="button" aria-label={`${correction.from} 매핑 삭제`}>
        −
      </button>
    </div>
  );
}

function AddWordMock() {
  return (
    <div className="wordsets-add-row" aria-label="word add mock">
      <span className="wordsets-textfield">새 단어 추가</span>
      <button type="button" aria-label="단어 추가" data-enabled="false">
        +
      </button>
    </div>
  );
}

function AddCorrectionMock() {
  return (
    <div className="wordsets-correction-add-row" aria-label="correction add mock">
      <span className="wordsets-textfield">잘못된 표현</span>
      <span className="wordsets-correction-arrow" aria-hidden="true">→</span>
      <span className="wordsets-textfield">올바른 단어</span>
      <button type="button" aria-label="교정 매핑 추가" data-enabled="false">+</button>
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
            {wordSet.words.length}개 단어
            {wordSet.corrections.length > 0 ? ` · ${wordSet.corrections.length}개 매핑` : ''}
          </span>
        </button>
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
              <div className="wordsets-word-list" aria-label={`${wordSet.name} 단어 목록`}>
                {wordSet.words.map((word) => <WordRow word={word} label="단어" key={word} />)}
              </div>
            ) : (
              <p className="wordsets-empty-copy">단어가 없습니다.</p>
            )}
            <AddWordMock />
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

export function DomainWordSetsPanelMock({
  settings,
}: {
  readonly settings: AppSettingsSnapshot;
}) {
  const domainWordSets = settings.domainWordSets.length > 0 ? settings.domainWordSets.map(toMockWordSet) : defaultWordSets;
  const [expandedIds] = useState<ReadonlySet<string>>(() => new Set([domainWordSets[0]?.id ?? 'it-dev']));

  return (
    <div className="wordsets-panel-mock" data-testid="domain-wordsets-panel-mock">
      <div className="wordsets-guidance">
        <p>도메인 단어 세트</p>
        <span>도메인별 단어 세트를 활성화하면 음성 인식과 교정 단계에서 해당 단어들이 더 정확하게 처리됩니다.</span>
      </div>

      <div className="wordsets-domain-list">
        {domainWordSets.map((wordSet) => (
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

function toMockWordSet(wordSet: DomainWordSet): DomainWordSetMock {
  return {
    id: wordSet.id,
    name: wordSet.name,
    enabled: wordSet.isEnabled,
    words: wordSet.words,
    corrections: wordSet.corrections,
  };
}
