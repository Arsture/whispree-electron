import { describe, expect, it } from 'vitest';
import { promptTemplateIdForCorrectionMode } from './prompts';
import { wordEditDistance } from './safety';
import { normalizeCorrectionMode } from './settings';

describe('safety helpers and prompt identifiers', () => {
  it('computes word-level edit distance for equality and differences', () => {
    expect(wordEditDistance('hello whispree', 'hello whispree')).toBe(0);
    expect(wordEditDistance('hello whispree', 'hello codex')).toBe(1);
    expect(wordEditDistance('hello whispree', 'hello fast codex')).toBe(2);
  });

  it('exports stable prompt template identifiers without calling providers', () => {
    expect(promptTemplateIdForCorrectionMode('standard')).toBe('standard-stt-correction');
    expect(promptTemplateIdForCorrectionMode('filler-removal')).toBe('filler-removal');
    expect(promptTemplateIdForCorrectionMode('structured')).toBe('structured-notes');
    expect(promptTemplateIdForCorrectionMode('custom')).toBe('custom');
  });

  it('keeps the legacy correction mode alias explicit', () => {
    expect(normalizeCorrectionMode('promptEngineering')).toBe('filler-removal');
    expect(normalizeCorrectionMode('unexpected')).toBe('standard');
  });
});
