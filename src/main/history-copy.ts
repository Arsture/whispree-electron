import type { AppSnapshot, CommandResult, HistoryTextVariant } from '../shared/ipc';
import { commandError, commandOk } from './ipc-validation';

export interface ClipboardWriter {
  writeText(text: string): void;
}

export function copyHistoryTextFromSnapshot(
  snapshot: AppSnapshot,
  historyId: unknown,
  variant: unknown,
  clipboardWriter: ClipboardWriter,
): CommandResult {
  if (typeof historyId !== 'string' || !isHistoryTextVariant(variant)) {
    return commandError('copy-history-text', snapshot, 'Invalid history copy request.', 'invalid-input');
  }

  const record = snapshot.history.find((candidate) => candidate.id === historyId);
  if (!record) return commandError('copy-history-text', snapshot, `Unknown history record: ${historyId}`, 'invalid-input');

  const text = variant === 'original' ? record.originalText : record.correctedText;
  try {
    clipboardWriter.writeText(text);
  } catch (error) {
    return commandError(
      'copy-history-text',
      snapshot,
      error instanceof Error ? error.message : String(error),
      'unsupported',
    );
  }

  return commandOk('copy-history-text', snapshot, `${variant} text copied (${text.length} chars).`);
}

function isHistoryTextVariant(value: unknown): value is HistoryTextVariant {
  return value === 'original' || value === 'corrected';
}
