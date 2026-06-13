import { describe, expect, it } from 'vitest';
import { buildCorrectionSystemPrompt, correctionPromptForMode, promptTemplateIdForCorrectionMode } from './prompts';
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

  it('builds Swift-faithful correction prompts with mappings and screenshot context', () => {
    expect(correctionPromptForMode('standard', 'ko')).toContain('한국어 음성인식 후처리 전문가');
    expect(correctionPromptForMode('standard', 'en')).toContain('Fix ONLY clear speech-to-text errors');
    const prompt = buildCorrectionSystemPrompt({
      mode: 'structured',
      language: 'ko',
      customPrompt: null,
      correctionMappings: [{ id: 'm1', from: '리엑트', to: 'React' }],
      includeScreenshotPrompt: true,
    });

    expect(prompt).toContain('내용을 구조화합니다');
    expect(prompt).toContain('리엑트 → React');
    expect(prompt).toContain('[시각 맥락]');
    expect(prompt).toContain('교정된 텍스트만 출력하세요');
  });

  it('keeps the legacy correction mode alias explicit', () => {
    expect(normalizeCorrectionMode('promptEngineering')).toBe('filler-removal');
    expect(normalizeCorrectionMode('unexpected')).toBe('standard');
  });
});
