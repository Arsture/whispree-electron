import type { CorrectionMapping, DomainWordSet } from './settings';

export type DomainCategory = 'it-dev' | 'statistics' | 'custom';

export interface DefaultDomainWordSetDefinition {
  readonly category: DomainCategory;
  readonly name: string;
  readonly description: string;
  readonly words: readonly string[];
  readonly corrections: readonly CorrectionMapping[];
}

export const defaultDomainWordSetDefinitions: readonly DefaultDomainWordSetDefinition[] = [
  {
    category: 'it-dev',
    name: 'IT/개발',
    description: 'API, React, Docker, LLM 등 개발 용어 30개',
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
      'Kubernetes',
      'database',
      'query',
      'endpoint',
      'middleware',
      'refactor',
      'debug',
      'commit',
      'branch',
      'pipeline',
      'LLM',
      'GPT',
      'Claude',
      'Whisper',
      'CoreML',
      'MLX',
      'framework',
      'library',
      'package',
      'dependency',
      'authentication',
      'OAuth',
      'token',
      'JWT',
      'session',
      'server',
      'client',
      'request',
      'response',
      'streaming',
    ],
    corrections: [],
  },
  {
    category: 'statistics',
    name: '통계',
    description: 'T-distribution, p-value, ANOVA 등 통계 용어 24개',
    words: [
      'T-distribution',
      'p-value',
      'regression',
      'hypothesis',
      'ANOVA',
      'chi-square',
      'correlation',
      'variance',
      'standard deviation',
      'confidence interval',
      'sample',
      'population',
      'mean',
      'median',
      'outlier',
      'bootstrap',
      'Bayesian',
      'posterior',
      'prior',
      'likelihood',
      'overfitting',
      'cross-validation',
      'feature',
      'gradient',
    ],
    corrections: [],
  },
  {
    category: 'custom',
    name: '사용자 정의',
    description: '직접 단어를 추가할 수 있는 빈 세트',
    words: [],
    corrections: [],
  },
];

export function generateDefaultDomainWordSet(
  category: DomainCategory,
  idFactory: (prefix: string) => string = stableDefaultId,
): DomainWordSet {
  const definition = defaultDomainWordSetDefinitions.find((candidate) => candidate.category === category);
  if (!definition) throw new Error(`Unknown domain word set category: ${category}`);
  return {
    id: idFactory(definition.category),
    name: definition.name,
    words: [...definition.words],
    corrections: definition.corrections.map((mapping) => ({ ...mapping })),
    isEnabled: true,
  };
}

export function isDefaultDomainWordSetAdded(sets: readonly DomainWordSet[], category: DomainCategory): boolean {
  const definition = defaultDomainWordSetDefinitions.find((candidate) => candidate.category === category);
  return definition ? sets.some((set) => set.name === definition.name) : false;
}

export function addDefaultDomainWordSet(
  sets: readonly DomainWordSet[],
  category: DomainCategory,
  idFactory?: (prefix: string) => string,
): readonly DomainWordSet[] {
  if (isDefaultDomainWordSetAdded(sets, category)) return sets;
  return [...sets, generateDefaultDomainWordSet(category, idFactory)];
}

export function toggleDomainWordSet(sets: readonly DomainWordSet[], setId: string, isEnabled: boolean): readonly DomainWordSet[] {
  return sets.map((set) => set.id === setId ? { ...set, isEnabled } : set);
}

export function addWordToDomainWordSet(sets: readonly DomainWordSet[], setId: string, word: string): readonly DomainWordSet[] {
  const trimmed = word.trim();
  if (!trimmed) return sets;
  return sets.map((set) => {
    if (set.id !== setId || set.words.includes(trimmed)) return set;
    return { ...set, words: [...set.words, trimmed] };
  });
}

export function deleteWordFromDomainWordSet(sets: readonly DomainWordSet[], setId: string, wordIndex: number): readonly DomainWordSet[] {
  return sets.map((set) => {
    if (set.id !== setId) return set;
    return { ...set, words: set.words.filter((_word, index) => index !== wordIndex) };
  });
}

export function addCorrectionToDomainWordSet(
  sets: readonly DomainWordSet[],
  setId: string,
  from: string,
  to: string,
  idFactory: (prefix: string) => string = createRuntimeId,
): readonly DomainWordSet[] {
  const trimmedFrom = from.trim();
  const trimmedTo = to.trim();
  if (!trimmedFrom || !trimmedTo) return sets;
  return sets.map((set) => {
    if (set.id !== setId) return set;
    const exists = set.corrections.some((mapping) => mapping.from === trimmedFrom && mapping.to === trimmedTo);
    if (exists) return set;
    return {
      ...set,
      corrections: [...set.corrections, { id: idFactory('correction'), from: trimmedFrom, to: trimmedTo }],
    };
  });
}

export function deleteCorrectionFromDomainWordSet(
  sets: readonly DomainWordSet[],
  setId: string,
  correctionIndex: number,
): readonly DomainWordSet[] {
  return sets.map((set) => {
    if (set.id !== setId) return set;
    return { ...set, corrections: set.corrections.filter((_mapping, index) => index !== correctionIndex) };
  });
}

export function addQuickFixWord(sets: readonly DomainWordSet[], word: string): readonly DomainWordSet[] {
  const [quickFix, others] = ensureQuickFixSet(sets);
  return [addWordToSingleSet(quickFix, word), ...others];
}

export function addQuickFixCorrection(sets: readonly DomainWordSet[], from: string, to: string): readonly DomainWordSet[] {
  const [quickFix, others] = ensureQuickFixSet(sets);
  return [addCorrectionToSingleSet(quickFix, from, to), ...others];
}

function ensureQuickFixSet(sets: readonly DomainWordSet[]): readonly [DomainWordSet, readonly DomainWordSet[]] {
  const existing = sets.find((set) => set.name === 'Quick Fix');
  if (existing) return [existing, sets.filter((set) => set.id !== existing.id)];
  return [{
    id: createRuntimeId('quick-fix'),
    name: 'Quick Fix',
    words: [],
    corrections: [],
    isEnabled: true,
  }, sets];
}

function addWordToSingleSet(set: DomainWordSet, word: string): DomainWordSet {
  const trimmed = word.trim();
  if (!trimmed || set.words.includes(trimmed)) return set;
  return { ...set, words: [...set.words, trimmed] };
}

function addCorrectionToSingleSet(set: DomainWordSet, from: string, to: string): DomainWordSet {
  const trimmedFrom = from.trim();
  const trimmedTo = to.trim();
  if (!trimmedFrom || !trimmedTo) return set;
  const exists = set.corrections.some((mapping) => mapping.from === trimmedFrom && mapping.to === trimmedTo);
  if (exists) return set;
  return {
    ...set,
    corrections: [...set.corrections, { id: createRuntimeId('correction'), from: trimmedFrom, to: trimmedTo }],
  };
}

function stableDefaultId(prefix: string): string {
  return `default-${prefix}`;
}

function createRuntimeId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
