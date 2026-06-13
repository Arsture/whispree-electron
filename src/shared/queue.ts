import type { CorrectionMapping, CorrectionMode, DomainWordSet, LLMProviderType, STTProviderType, SupportedLanguage } from './settings';

export type DictationJobId = string;

export type DictationJobStatus =
  | 'queued'
  | 'transcribing'
  | 'correcting'
  | 'ready-for-delivery'
  | 'awaiting-screenshot-selection'
  | 'delivering'
  | 'delivered'
  | 'copied-to-clipboard'
  | 'failed'
  | 'canceled'
  | 'skipped';

export const TERMINAL_JOB_STATUSES: readonly DictationJobStatus[] = [
  'delivered',
  'copied-to-clipboard',
  'failed',
  'canceled',
  'skipped',
] as const;

const PROCESSING_JOB_STATUSES: readonly DictationJobStatus[] = ['queued', 'transcribing', 'correcting'] as const;
const DELIVERABLE_JOB_STATUSES: readonly DictationJobStatus[] = [
  'ready-for-delivery',
  'awaiting-screenshot-selection',
] as const;

export interface DictationJobSnapshot {
  readonly sttProviderType: STTProviderType;
  readonly llmProviderType: LLMProviderType;
  readonly llmEnabled: boolean;
  readonly correctionMode: CorrectionMode;
  readonly customPrompt: string | null;
  readonly language: SupportedLanguage;
  readonly glossary: readonly string[];
  readonly domainWordSets: readonly DomainWordSet[];
  readonly correctionMappings: readonly CorrectionMapping[];
  readonly screenshotContextEnabled: boolean;
  readonly screenshotPasteEnabled: boolean;
  readonly vadEnabled: boolean;
}

export interface DictationJob {
  readonly id: DictationJobId;
  readonly sequence: number;
  readonly createdAtIso: string;
  readonly snapshot: DictationJobSnapshot;
  readonly status: DictationJobStatus;
  readonly targetContextId: string | null;
  readonly screenshotIds: readonly string[];
  readonly selectedImageIds: readonly string[];
  readonly transcribedText: string;
  readonly correctedText: string;
  readonly error: string | null;
}

export interface EnqueueDictationJobInput {
  readonly id?: DictationJobId;
  readonly createdAtIso?: string;
  readonly snapshot: DictationJobSnapshot;
  readonly targetContextId?: string | null;
  readonly screenshotIds?: readonly string[];
}

export interface QueueSnapshotProjection {
  readonly totalCount: number;
  readonly processingCount: number;
  readonly deliveryReadyCount: number;
  readonly terminalCount: number;
  readonly isRecordingActive: boolean;
  readonly activeDeliverySequence: number | null;
  readonly foregroundJobSequence: number | null;
}

export function isTerminalJobStatus(status: DictationJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

export function isProcessingJobStatus(status: DictationJobStatus): boolean {
  return PROCESSING_JOB_STATUSES.includes(status);
}

export function isDeliverableJobStatus(status: DictationJobStatus): boolean {
  return DELIVERABLE_JOB_STATUSES.includes(status);
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function replaceJob(jobs: readonly DictationJob[], id: DictationJobId, update: (job: DictationJob) => DictationJob): DictationJob[] {
  return jobs.map((job) => (job.id === id ? update(job) : job));
}

export class DictationQueueState {
  readonly #jobs: DictationJob[] = [];
  #nextSequence = 1;
  #recordingActive = false;
  #activeDeliveryJobId: DictationJobId | null = null;

  get jobs(): readonly DictationJob[] {
    return cloneSerializable(this.#jobs);
  }

  get isRecordingActive(): boolean {
    return this.#recordingActive;
  }

  setRecordingActive(active: boolean): QueueSnapshotProjection {
    this.#recordingActive = active;
    return this.snapshot();
  }

  enqueue(input: EnqueueDictationJobInput): DictationJob {
    const job: DictationJob = {
      id: input.id ?? `job-${this.#nextSequence}`,
      sequence: this.#nextSequence,
      createdAtIso: input.createdAtIso ?? new Date(0).toISOString(),
      snapshot: cloneSerializable(input.snapshot),
      status: 'queued',
      targetContextId: input.targetContextId ?? null,
      screenshotIds: [...(input.screenshotIds ?? [])],
      selectedImageIds: [],
      transcribedText: '',
      correctedText: '',
      error: null,
    };
    this.#nextSequence += 1;
    this.#jobs.push(job);
    return cloneSerializable(job);
  }

  getJob(id: DictationJobId): DictationJob | null {
    const job = this.#jobs.find((candidate) => candidate.id === id);
    return job ? cloneSerializable(job) : null;
  }

  transitionJob(
    id: DictationJobId,
    status: DictationJobStatus,
    patch: Partial<Pick<DictationJob, 'transcribedText' | 'correctedText' | 'error' | 'selectedImageIds'>> = {},
  ): DictationJob {
    const existing = this.#jobs.find((job) => job.id === id);
    if (!existing) throw new Error(`Unknown dictation job: ${id}`);
    if (isTerminalJobStatus(existing.status) && !isTerminalJobStatus(status)) {
      throw new Error(`Cannot resurrect terminal dictation job: ${id}`);
    }
    const nextJobs = replaceJob(this.#jobs, id, (job) => ({
      ...job,
      status,
      transcribedText: patch.transcribedText ?? job.transcribedText,
      correctedText: patch.correctedText ?? job.correctedText,
      error: patch.error ?? job.error,
      selectedImageIds: patch.selectedImageIds ? [...patch.selectedImageIds] : job.selectedImageIds,
    }));
    this.#jobs.splice(0, this.#jobs.length, ...nextJobs);
    if (id === this.#activeDeliveryJobId && isTerminalJobStatus(status)) {
      this.#activeDeliveryJobId = null;
    }
    return this.getJob(id)!;
  }

  nextDeliverableJob(): DictationJob | null {
    if (this.#recordingActive) return null;
    const head = this.#jobs.find((job) => !isTerminalJobStatus(job.status));
    if (!head || !isDeliverableJobStatus(head.status)) return null;
    return cloneSerializable(head);
  }

  startDelivery(id: DictationJobId): DictationJob {
    const deliverable = this.nextDeliverableJob();
    if (!deliverable || deliverable.id !== id) {
      throw new Error(`Job is not FIFO-deliverable: ${id}`);
    }
    this.#activeDeliveryJobId = id;
    return this.transitionJob(id, 'delivering');
  }

  cancelForegroundJob(): DictationJob | null {
    const foreground = this.foregroundJob();
    if (!foreground) return null;
    return this.transitionJob(foreground.id, 'canceled');
  }

  foregroundJob(): DictationJob | null {
    if (this.#activeDeliveryJobId) return this.getJob(this.#activeDeliveryJobId);
    const job = this.#jobs.find((candidate) => !isTerminalJobStatus(candidate.status));
    return job ? cloneSerializable(job) : null;
  }

  snapshot(): QueueSnapshotProjection {
    return {
      totalCount: this.#jobs.length,
      processingCount: this.#jobs.filter((job) => isProcessingJobStatus(job.status)).length,
      deliveryReadyCount: this.#jobs.filter((job) => isDeliverableJobStatus(job.status)).length,
      terminalCount: this.#jobs.filter((job) => isTerminalJobStatus(job.status)).length,
      isRecordingActive: this.#recordingActive,
      activeDeliverySequence: this.#activeDeliveryJobId ? this.getJob(this.#activeDeliveryJobId)?.sequence ?? null : null,
      foregroundJobSequence: this.foregroundJob()?.sequence ?? null,
    };
  }
}
