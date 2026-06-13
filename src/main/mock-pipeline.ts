import {
  type AppSnapshot,
  type HistoryRecordSnapshot,
  type PermissionCardSnapshot,
  type ProviderCardSnapshot,
  type QueueItemSnapshot,
} from '../shared/ipc';
import type { AudioCaptureAdapter } from '../shared/adapters';
import { createAdapterSet, permissionCardsForAdapterSet } from './adapters/adapter-factory';
import { MockAudioCaptureAdapter } from './adapters/mock-adapters';
import { llmProviderChoices, sttProviderChoices } from '../shared/provider-registry';
import { MockLLMProvider, MockSTTProvider, localModelBackendRegistry } from '../shared/providers';
import { DictationQueueState, isDeliverableJobStatus, isProcessingJobStatus, isTerminalJobStatus, type DictationJob, type DictationJobSnapshot } from '../shared/queue';
import { defaultAppSettings } from '../shared/settings';

interface MockPipelineOptions {
  readonly recordingDelayMs?: number;
  readonly sttDelayMs?: number;
  readonly llmDelayMs?: number;
  readonly deliveryDelayMs?: number;
  readonly glossary?: readonly string[];
}

type SnapshotListener = (snapshot: AppSnapshot) => void;
type Delay = (milliseconds: number) => Promise<void>;

interface MockDictationPipelineAdapters {
  readonly audio?: AudioCaptureAdapter;
}

const defaultDelay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const providerCards: readonly ProviderCardSnapshot[] = [
  ...sttProviderChoices.map(providerChoiceToCard),
  ...llmProviderChoices.map(providerChoiceToCard),
  ...localModelBackendRegistry.map((backend) => backend.descriptor),
];

function providerChoiceToCard(provider: (typeof sttProviderChoices | typeof llmProviderChoices)[number]): ProviderCardSnapshot {
  return {
    id: provider.id,
    label: provider.label,
    family: provider.family,
    status: provider.status,
    platform: provider.platform,
    detail: provider.detail,
  };
}

const permissionCards: readonly PermissionCardSnapshot[] = permissionCardsForAdapterSet(createAdapterSet(process.platform));

export class MockDictationPipeline {
  readonly #queue = new DictationQueueState();
  readonly #sttProvider = new MockSTTProvider();
  readonly #llmProvider = new MockLLMProvider();
  readonly #listeners = new Set<SnapshotListener>();
  readonly #tasks = new Set<Promise<void>>();
  readonly #delay: Delay;
  readonly #audioAdapter: AudioCaptureAdapter;
  #history: HistoryRecordSnapshot[] = [];
  #currentError: { readonly message: string } | null = null;
  #activeRecordingId: string | null = null;
  #nextRecordingId = 1;
  readonly #canceledRecordingIds = new Set<string>();

  constructor(listener?: SnapshotListener, delay: Delay = defaultDelay, adapters: MockDictationPipelineAdapters = {}) {
    if (listener) this.#listeners.add(listener);
    this.#delay = delay;
    this.#audioAdapter = adapters.audio ?? new MockAudioCaptureAdapter();
  }

  subscribe(listener: SnapshotListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  getSnapshot(): AppSnapshot {
    const queueSnapshot = this.#queue.snapshot();
    const jobs = this.#queue.jobs.map((job) => this.#jobToSnapshot(job));
    const latest = this.#history[0]
      ? {
          originalText: this.#history[0].originalText,
          correctedText: this.#history[0].correctedText,
        }
      : null;

    return {
      appStatus: queueSnapshot.isRecordingActive
        ? 'recording'
        : queueSnapshot.processingCount > 0
          ? 'processing'
          : 'ready',
      recording: {
        active: queueSnapshot.isRecordingActive,
        mode: 'mock',
        label: queueSnapshot.isRecordingActive
          ? 'Mock recording in progress'
          : queueSnapshot.processingCount > 0
            ? 'Mock provider pipeline processing'
            : 'Ready for mock recording',
      },
      queue: {
        ...queueSnapshot,
        items: jobs,
      },
      latest,
      providers: providerCards,
      permissions: permissionCards,
      history: this.#history,
      currentError: this.#currentError,
    };
  }

  enqueueMockDictation(options: MockPipelineOptions = {}): AppSnapshot {
    if (this.#queue.isRecordingActive) return this.getSnapshot();

    const recordingId = `recording-${this.#nextRecordingId}`;
    this.#nextRecordingId += 1;
    this.#activeRecordingId = recordingId;
    this.#queue.setRecordingActive(true);
    this.#emit();
    const task = this.#runMockJob(recordingId, {
      recordingDelayMs: 120,
      sttDelayMs: 160,
      llmDelayMs: 120,
      deliveryDelayMs: 40,
      glossary: [],
      ...options,
    });
    this.#track(task);
    return this.getSnapshot();
  }

  cancelForegroundJob(): AppSnapshot {
    if (this.#queue.isRecordingActive && this.#activeRecordingId) {
      this.#canceledRecordingIds.add(this.#activeRecordingId);
      this.#activeRecordingId = null;
      this.#queue.setRecordingActive(false);
      void this.#audioAdapter.stop().catch(() => undefined);
      this.#emit();
      return this.getSnapshot();
    }

    this.#queue.cancelForegroundJob();
    this.#emit();
    void this.#tryDeliverReadyJobs();
    return this.getSnapshot();
  }

  async whenIdle(): Promise<void> {
    while (this.#tasks.size > 0) {
      await Promise.all([...this.#tasks]);
    }
  }

  async #runMockJob(recordingId: string, options: Required<MockPipelineOptions>): Promise<void> {
    let jobId: string | null = null;
    try {
      await this.#audioAdapter.start();
      await this.#delay(options.recordingDelayMs);
      if (this.#canceledRecordingIds.delete(recordingId)) return;
      if (this.#activeRecordingId === recordingId) this.#activeRecordingId = null;

      const audio = await this.#audioAdapter.stop();

      const job = this.#queue.enqueue({
        id: `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAtIso: new Date().toISOString(),
        snapshot: this.#createJobSnapshot(options.glossary),
        targetContextId: 'mock-target',
      });
      jobId = job.id;
      this.#queue.setRecordingActive(false);
      this.#queue.transitionJob(job.id, 'transcribing');
      this.#currentError = null;
      this.#emit();

      await this.#delay(options.sttDelayMs);
      const transcription = await this.#sttProvider.transcribe({
        jobId: job.id,
        sequence: job.sequence,
        language: job.snapshot.language,
        glossary: job.snapshot.glossary,
        audioRef: { kind: 'mock', value: audio.audioRef || job.id },
      });
      this.#queue.transitionJob(job.id, 'correcting', { transcribedText: transcription.text });
      this.#emit();

      await this.#delay(options.llmDelayMs);
      const correction = await this.#llmProvider.correct({
        jobId: job.id,
        sequence: job.sequence,
        text: transcription.text,
        mode: job.snapshot.correctionMode,
        glossary: job.snapshot.glossary,
        screenshotRefs: job.screenshotIds,
      });
      this.#queue.transitionJob(job.id, 'ready-for-delivery', {
        correctedText: correction.correctedText,
      });
      this.#emit();

      await this.#tryDeliverReadyJobs(options.deliveryDelayMs);
    } catch (error) {
      this.#handlePipelineFailure(recordingId, jobId, error);
    }
  }

  #handlePipelineFailure(recordingId: string, jobId: string | null, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    if (this.#activeRecordingId === recordingId) this.#activeRecordingId = null;
    this.#canceledRecordingIds.delete(recordingId);
    this.#queue.setRecordingActive(false);
    this.#currentError = { message };

    if (jobId) {
      const job = this.#queue.getJob(jobId);
      if (job && !isTerminalJobStatus(job.status)) {
        this.#queue.transitionJob(jobId, 'failed', { error: message });
      }
    }

    this.#emit();
  }


  async #tryDeliverReadyJobs(deliveryDelayMs = 0): Promise<void> {
    let next = this.#queue.nextDeliverableJob();
    while (next) {
      const delivering = this.#queue.startDelivery(next.id);
      this.#emit();
      await this.#delay(deliveryDelayMs);
      const delivered = this.#queue.transitionJob(delivering.id, 'delivered');
      this.#history = [this.#historyRecord(delivered), ...this.#history].slice(0, 20);
      this.#emit();
      next = this.#queue.nextDeliverableJob();
    }
  }

  #createJobSnapshot(glossary: readonly string[] = []): DictationJobSnapshot {
    return {
      sttProviderType: defaultAppSettings.sttProviderType,
      llmProviderType: defaultAppSettings.llmProviderType,
      llmEnabled: defaultAppSettings.llmEnabled,
      correctionMode: defaultAppSettings.correctionMode,
      customPrompt: defaultAppSettings.customLLMPrompt,
      language: defaultAppSettings.language,
      glossary,
      domainWordSets: defaultAppSettings.domainWordSets,
      correctionMappings: defaultAppSettings.correctionMappings,
      screenshotContextEnabled: defaultAppSettings.screenshotContextEnabled,
      screenshotPasteEnabled: defaultAppSettings.screenshotPasteEnabled,
      vadEnabled: defaultAppSettings.vadEnabled,
    };
  }

  #jobToSnapshot(job: DictationJob): QueueItemSnapshot {
    return {
      id: job.id,
      sequence: job.sequence,
      status: job.status,
      originalText: job.transcribedText,
      correctedText: job.correctedText,
      isDeliverable: isDeliverableJobStatus(job.status),
      isProcessing: isProcessingJobStatus(job.status),
      isTerminal: isTerminalJobStatus(job.status),
    };
  }

  #historyRecord(job: DictationJob): HistoryRecordSnapshot {
    return {
      id: job.id,
      sequence: job.sequence,
      originalText: job.transcribedText,
      correctedText: job.correctedText,
      deliveredAtIso: new Date().toISOString(),
      status: 'delivered',
    };
  }

  #track(task: Promise<void>): void {
    this.#tasks.add(task);
    void task.finally(() => this.#tasks.delete(task));
  }

  #emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }
}
