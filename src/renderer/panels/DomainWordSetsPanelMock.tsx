import { useMemo, useState } from 'react';
import {
  addCorrectionToDomainWordSet,
  addDefaultDomainWordSet,
  addWordToDomainWordSet,
  defaultDomainWordSetDefinitions,
  deleteCorrectionFromDomainWordSet,
  deleteWordFromDomainWordSet,
  isDefaultDomainWordSetAdded,
  toggleDomainWordSet,
  type DomainCategory,
} from '../../shared/domain-wordsets';
import type { AppSettingsSnapshot, AppSettingsUpdate, CorrectionMapping, DomainWordSet } from '../../shared/settings';

import '../styles/wordsets.css';

type UpdateSettings = (update: AppSettingsUpdate) => Promise<void>;

function DomainToggle({ checked, onToggle }: { readonly checked: boolean; readonly onToggle: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      className="wordsets-switch"
      data-checked={checked}
      role="switch"
      aria-checked={checked}
      aria-label={checked ? '단어 세트 비활성화' : '단어 세트 활성화'}
      onClick={() => onToggle(!checked)}
    >
      <span aria-hidden="true" />
    </button>
  );
}

function WordRow({ word, index, onDelete }: { readonly word: string; readonly index: number; readonly onDelete: (index: number) => void }) {
  return (
    <div className="wordsets-word-row">
      <span className="wordsets-textfield" aria-label="단어">{word}</span>
      <button type="button" aria-label={`${word} 삭제`} onClick={() => onDelete(index)}>
        −
      </button>
    </div>
  );
}

function CorrectionRow({ correction, index, onDelete }: { readonly correction: CorrectionMapping; readonly index: number; readonly onDelete: (index: number) => void }) {
  return (
    <div className="wordsets-correction-row">
      <code>{correction.from}</code>
      <span className="wordsets-correction-arrow" aria-hidden="true">→</span>
      <code>{correction.to}</code>
      <span className="wordsets-correction-spacer" />
      <button type="button" aria-label={`${correction.from} 매핑 삭제`} onClick={() => onDelete(index)}>
        −
      </button>
    </div>
  );
}

function AddWordRow({ value, onChange, onAdd }: { readonly value: string; readonly onChange: (value: string) => void; readonly onAdd: () => void }) {
  const enabled = value.trim().length > 0;
  return (
    <form className="wordsets-add-row" aria-label="word add" onSubmit={(event) => { event.preventDefault(); onAdd(); }}>
      <input className="wordsets-textfield" value={value} placeholder="새 단어 추가" aria-label="새 단어 추가" onChange={(event) => onChange(event.currentTarget.value)} />
      <button type="submit" aria-label="단어 추가" data-enabled={enabled} disabled={!enabled}>
        +
      </button>
    </form>
  );
}

function AddCorrectionRow({
  from,
  to,
  onFromChange,
  onToChange,
  onAdd,
}: {
  readonly from: string;
  readonly to: string;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
  readonly onAdd: () => void;
}) {
  const enabled = from.trim().length > 0 && to.trim().length > 0;
  return (
    <form className="wordsets-correction-add-row" aria-label="correction add" onSubmit={(event) => { event.preventDefault(); onAdd(); }}>
      <input className="wordsets-textfield" value={from} placeholder="잘못된 표현" aria-label="잘못된 표현" onChange={(event) => onFromChange(event.currentTarget.value)} />
      <span className="wordsets-correction-arrow" aria-hidden="true">→</span>
      <input className="wordsets-textfield" value={to} placeholder="올바른 단어" aria-label="올바른 단어" onChange={(event) => onToChange(event.currentTarget.value)} />
      <button type="submit" aria-label="교정 매핑 추가" data-enabled={enabled} disabled={!enabled}>+</button>
    </form>
  );
}

function WordSetSection({
  wordSet,
  expanded,
  newWord,
  newCorrectionFrom,
  newCorrectionTo,
  onToggleExpanded,
  onToggleEnabled,
  onNewWordChange,
  onNewCorrectionFromChange,
  onNewCorrectionToChange,
  onAddWord,
  onDeleteWord,
  onAddCorrection,
  onDeleteCorrection,
}: {
  readonly wordSet: DomainWordSet;
  readonly expanded: boolean;
  readonly newWord: string;
  readonly newCorrectionFrom: string;
  readonly newCorrectionTo: string;
  readonly onToggleExpanded: () => void;
  readonly onToggleEnabled: (enabled: boolean) => void;
  readonly onNewWordChange: (value: string) => void;
  readonly onNewCorrectionFromChange: (value: string) => void;
  readonly onNewCorrectionToChange: (value: string) => void;
  readonly onAddWord: () => void;
  readonly onDeleteWord: (index: number) => void;
  readonly onAddCorrection: () => void;
  readonly onDeleteCorrection: (index: number) => void;
}) {
  return (
    <section className="wordsets-domain-card" data-enabled={wordSet.isEnabled} data-expanded={expanded}>
      <header className="wordsets-domain-header">
        <DomainToggle checked={wordSet.isEnabled} onToggle={onToggleEnabled} />
        <button type="button" className="wordsets-domain-title" aria-expanded={expanded} onClick={onToggleExpanded}>
          <strong>{wordSet.name}</strong>
          <span>
            {wordSet.words.length}개 단어
            {wordSet.corrections.length > 0 ? ` · ${wordSet.corrections.length}개 매핑` : ''}
          </span>
        </button>
        <button type="button" className="wordsets-chevron" aria-label={`${wordSet.name} 펼치기`} onClick={onToggleExpanded}>
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
                {wordSet.words.map((word, index) => <WordRow word={word} index={index} onDelete={onDeleteWord} key={`${wordSet.id}-${word}-${index}`} />)}
              </div>
            ) : (
              <p className="wordsets-empty-copy">단어가 없습니다.</p>
            )}
            <AddWordRow value={newWord} onChange={onNewWordChange} onAdd={onAddWord} />
          </div>

          <div className="wordsets-field-group">
            <div className="wordsets-group-label">
              <strong>교정 매핑</strong>
              <span>LLM only</span>
            </div>
            {wordSet.corrections.length > 0 ? (
              <div className="wordsets-correction-list">
                {wordSet.corrections.map((correction, index) => (
                  <CorrectionRow correction={correction} index={index} onDelete={onDeleteCorrection} key={correction.id} />
                ))}
              </div>
            ) : (
              <p className="wordsets-empty-copy">교정 매핑이 없습니다.</p>
            )}
            <AddCorrectionRow
              from={newCorrectionFrom}
              to={newCorrectionTo}
              onFromChange={onNewCorrectionFromChange}
              onToChange={onNewCorrectionToChange}
              onAdd={onAddCorrection}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function DomainWordSetsPanelMock({
  settings,
  onUpdateSettings,
}: {
  readonly settings: AppSettingsSnapshot;
  readonly onUpdateSettings: UpdateSettings;
}) {
  const domainWordSets = settings.domainWordSets;
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [newWordText, setNewWordText] = useState<Record<string, string>>({});
  const [newCorrectionFrom, setNewCorrectionFrom] = useState<Record<string, string>>({});
  const [newCorrectionTo, setNewCorrectionTo] = useState<Record<string, string>>({});
  const effectiveExpandedIds = useMemo(() => {
    if (expandedIds.size > 0) return expandedIds;
    return new Set([domainWordSets[0]?.id ?? '']);
  }, [domainWordSets, expandedIds]);

  const updateWordSets = (domainWordSetsUpdate: readonly DomainWordSet[]) => onUpdateSettings({ domainWordSets: domainWordSetsUpdate });
  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="wordsets-panel-mock" data-testid="domain-wordsets-panel-mock">
      <div className="wordsets-guidance">
        <p>도메인 단어 세트</p>
        <span>도메인별 단어 세트를 활성화하면 음성 인식과 교정 단계에서 해당 단어들이 더 정확하게 처리됩니다.</span>
      </div>

      <div className="wordsets-domain-list">
        {domainWordSets.length > 0 ? domainWordSets.map((wordSet) => (
          <WordSetSection
            wordSet={wordSet}
            expanded={effectiveExpandedIds.has(wordSet.id)}
            newWord={newWordText[wordSet.id] ?? ''}
            newCorrectionFrom={newCorrectionFrom[wordSet.id] ?? ''}
            newCorrectionTo={newCorrectionTo[wordSet.id] ?? ''}
            onToggleExpanded={() => toggleExpanded(wordSet.id)}
            onToggleEnabled={(isEnabled) => void updateWordSets(toggleDomainWordSet(domainWordSets, wordSet.id, isEnabled))}
            onNewWordChange={(value) => setNewWordText((current) => ({ ...current, [wordSet.id]: value }))}
            onNewCorrectionFromChange={(value) => setNewCorrectionFrom((current) => ({ ...current, [wordSet.id]: value }))}
            onNewCorrectionToChange={(value) => setNewCorrectionTo((current) => ({ ...current, [wordSet.id]: value }))}
            onAddWord={() => {
              const value = newWordText[wordSet.id] ?? '';
              void updateWordSets(addWordToDomainWordSet(domainWordSets, wordSet.id, value));
              setNewWordText((current) => ({ ...current, [wordSet.id]: '' }));
            }}
            onDeleteWord={(index) => void updateWordSets(deleteWordFromDomainWordSet(domainWordSets, wordSet.id, index))}
            onAddCorrection={() => {
              const from = newCorrectionFrom[wordSet.id] ?? '';
              const to = newCorrectionTo[wordSet.id] ?? '';
              void updateWordSets(addCorrectionToDomainWordSet(domainWordSets, wordSet.id, from, to));
              setNewCorrectionFrom((current) => ({ ...current, [wordSet.id]: '' }));
              setNewCorrectionTo((current) => ({ ...current, [wordSet.id]: '' }));
            }}
            onDeleteCorrection={(index) => void updateWordSets(deleteCorrectionFromDomainWordSet(domainWordSets, wordSet.id, index))}
            key={wordSet.id}
          />
        )) : (
          <section className="wordsets-domain-card" data-enabled="false" data-expanded="true">
            <div className="wordsets-domain-body">
              <p className="wordsets-empty-copy">등록된 단어 세트가 없습니다. 아래에서 기본 세트를 추가하거나 직접 세트를 만들어 용어와 교정 매핑을 관리하세요.</p>
            </div>
          </section>
        )}
      </div>

      <section className="wordsets-default-section">
        <h2>기본 세트 추가</h2>
        <div className="wordsets-default-list">
          {defaultDomainWordSetDefinitions.map((set, index) => {
            const alreadyAdded = isDefaultDomainWordSetAdded(domainWordSets, set.category);
            return (
              <div className="wordsets-default-row" key={set.category}>
                {index > 0 ? <span className="wordsets-row-divider" aria-hidden="true" /> : null}
                <div>
                  <strong>{set.name}</strong>
                  <span>{set.description}</span>
                </div>
                {alreadyAdded ? (
                  <span className="wordsets-added-badge"><span aria-hidden="true">✓</span>추가됨</span>
                ) : (
                  <button type="button" onClick={() => void updateWordSets(addDefaultDomainWordSet(domainWordSets, set.category as DomainCategory))}>추가</button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
