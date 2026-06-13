import type { CorrectionMode } from './settings';

export const PROMPT_TEMPLATE_IDS = ['standard-stt-correction', 'filler-removal', 'structured-notes', 'custom'] as const;
export type PromptTemplateId = (typeof PROMPT_TEMPLATE_IDS)[number];

export function promptTemplateIdForCorrectionMode(mode: CorrectionMode): PromptTemplateId {
  switch (mode) {
    case 'filler-removal':
      return 'filler-removal';
    case 'structured':
      return 'structured-notes';
    case 'custom':
      return 'custom';
    case 'standard':
      return 'standard-stt-correction';
  }
}
