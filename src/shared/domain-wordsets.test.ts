import { describe, expect, it } from 'vitest';
import {
  addCorrectionToDomainWordSet,
  addDefaultDomainWordSet,
  addQuickFixCorrection,
  addQuickFixWord,
  addWordToDomainWordSet,
  defaultDomainWordSetDefinitions,
  deleteCorrectionFromDomainWordSet,
  deleteWordFromDomainWordSet,
  generateDefaultDomainWordSet,
  toggleDomainWordSet,
} from './domain-wordsets';
import type { DomainWordSet } from './settings';

describe('domain word set helpers', () => {
  it('generates Swift SSoT default word sets with full vocabulary counts', () => {
    expect(defaultDomainWordSetDefinitions.map((definition) => [definition.category, definition.words.length])).toEqual([
      ['it-dev', 42],
      ['statistics', 24],
      ['custom', 0],
    ]);
    expect(generateDefaultDomainWordSet('it-dev').words).toContain('Kubernetes');
    expect(generateDefaultDomainWordSet('statistics').words).toContain('cross-validation');
  });

  it('adds default sets once by display name like the Swift view', () => {
    const first = addDefaultDomainWordSet([], 'it-dev');
    const second = addDefaultDomainWordSet(first, 'it-dev');

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0]?.name).toBe('IT/개발');
  });

  it('copy-mutates toggles, words, and correction mappings', () => {
    const initial: readonly DomainWordSet[] = [{
      id: 'set-1',
      name: '사용자 정의',
      words: [],
      corrections: [],
      isEnabled: true,
    }];

    const disabled = toggleDomainWordSet(initial, 'set-1', false);
    const withWord = addWordToDomainWordSet(disabled, 'set-1', '  Whispree  ');
    const withDuplicateIgnored = addWordToDomainWordSet(withWord, 'set-1', 'Whispree');
    const withCorrection = addCorrectionToDomainWordSet(withDuplicateIgnored, 'set-1', '지피티', 'GPT', () => 'corr-1');
    const withoutWord = deleteWordFromDomainWordSet(withCorrection, 'set-1', 0);
    const withoutCorrection = deleteCorrectionFromDomainWordSet(withoutWord, 'set-1', 0);

    expect(disabled[0]?.isEnabled).toBe(false);
    expect(withDuplicateIgnored[0]?.words).toEqual(['Whispree']);
    expect(withCorrection[0]?.corrections).toEqual([{ id: 'corr-1', from: '지피티', to: 'GPT' }]);
    expect(withoutWord[0]?.words).toEqual([]);
    expect(withoutCorrection[0]?.corrections).toEqual([]);
  });

  it('creates and deduplicates the Quick Fix set for selected-text corrections', () => {
    const withWord = addQuickFixWord([], 'React');
    const withDuplicateWord = addQuickFixWord(withWord, 'React');
    const withCorrection = addQuickFixCorrection(withDuplicateWord, '리엑트', 'React');
    const withDuplicateCorrection = addQuickFixCorrection(withCorrection, '리엑트', 'React');

    expect(withDuplicateCorrection).toHaveLength(1);
    expect(withDuplicateCorrection[0]).toMatchObject({
      name: 'Quick Fix',
      words: ['React'],
      corrections: [{ from: '리엑트', to: 'React' }],
      isEnabled: true,
    });
  });
});
