import {
  type AppSnapshot,
  type HistoryRecordSnapshot,
  type PermissionCardSnapshot,
  type ProviderCardSnapshot,
  type QueueItemSnapshot,
  type PermissionKind,
  type PermissionState,
  type RecordedAudioInput,
} from '../shared/ipc';
import type { AudioCaptureAdapter, TextInsertionAdapter } from '../shared/adapters';
import { createAdapterSet, permissionCardsForAdapterSet } from './adapters/adapter-factory';
import { MockAudioCaptureAdapter, MockTextInsertionAdapter } from './adapters/mock-adapters';
import { llmProviderChoices, sttProviderChoices } from '../shared/provider-registry';
import { localModelBackendRegistry } from '../shared/providers';
import { DictationQueueState, isDeliverableJobStatus, isProcessingJobStatus, isTerminalJobStatus, type DictationJob, type DictationJobSnapshot } from '../shared/queue';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';
import { StaticProviderRouter, type ProviderRouter } from './provider-router';
import { localEngineRegistry } from './local-ai/engine-registry';

interface MockPipelineOptions {
  readonly recordingDelayMs?: number;
  readonly sttDelayMs?: number;
  readonly llmDelayMs?: number;
  readonly deliveryDelayMs?: number;
  readonly glossary?: readonly string[];
}

type SnapshotListener = (snapshot: AppSnapshot) => void;
type Delay = (milliseconds: number) => Promise<void>;

interface HistoryAppender {
  append(record: HistoryRecordSnapshot): Promise<unknown>;
}

interface MockDictationPipelineAdapters {
  readonly audio?: AudioCaptureAdapter;
  readonly textInsertion?: TextInsertionAdapter;
  readonly historyStore?: HistoryAppender;
  readonly initialHistory?: readonly HistoryRecordSnapshot[];
  readonly permissionCards?: readonly PermissionCardSnapshot[];
  readonly providerRouter?: ProviderRouter;
  readonly settingsProvider?: () => AppSettingsSnapshot;
}

const defaultDelay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const providerCards: readonly ProviderCardSnapshot[] = [
  ...sttProviderChoices.map(providerChoiceToCard),
  ...llmProviderChoices.map(providerChoiceToCard),
  ...localModelBackendRegistry.map((backend) => backend.descriptor),
  ...localEngineRegistry.map((engine) => engine.provider),
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
  readonly #providerRouter: ProviderRouter;
  readonly #settingsProvider: () => AppSettingsSnapshot;
  readonly #listeners = new Set<SnapshotListener>();
  readonly #tasks = new Set<Promise<void>>();
  readonly #delay: Delay;
  readonly #audioAdapter: AudioCaptureAdapter;
  readonly #textInsertionAdapter: TextInsertionAdapter;
  readonly #historyStore: HistoryAppender | null;
  #permissionCards: readonly PermissionCardSnapshot[];
  #history: HistoryRecordSnapshot[] = [];
  #currentError: { readonly message: string } | null = null;
  #activeRecordingId: string | null = null;
  #recordingMode: 'mock' | 'real' = 'mock';
  #nextRecordingId = 1;
  readonly #canceledRecordingIds = new Set<string>();

  constructor(listener?: SnapshotListener, delay: Delay = defaultDelay, adapters: MockDictationPipelineAdapters = {}) {
    if (listener) this.#listeners.add(listener);
    this.#delay = delay;
    this.#audioAdapter = adapters.audio ?? new MockAudioCaptureAdapter();
    this.#textInsertionAdapter = adapters.textInsertion ?? new MockTextInsertionAdapter();
    this.#historyStore = adapters.historyStore ?? null;
    this.#history = [...(adapters.initialHistory ?? [])].slice(0, 20);
    this.#permissionCards = adapters.permissionCards ?? permissionCards;
    this.#settingsProvider = adapters.settingsProvider ?? (() => defaultAppSettings);
    this.#providerRouter = adapters.providerRouter ?? new StaticProviderRouter();
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
        mode: this.#recordingMode,
        label: queueSnapshot.isRecordingActive
          ? this.#recordingMode === 'real' ? 'Real microphone recording in progress' : 'Mock recording in progress'
          : queueSnapshot.processingCount > 0
            ? this.#recordingMode === 'real' ? 'Real provider pipeline processing' : 'Mock provider pipeline processing'
            : 'Ready for recording',
      },
      queue: {
        ...queueSnapshot,
        items: jobs,
      },
      latest,
      providers: providerCards,
      permissions: this.#permissionCards,
      history: this.#history,
      currentError: this.#currentError,
    };
  }

  refreshPermissions(cards: readonly PermissionCardSnapshot[]): AppSnapshot {
    this.#permissionCards = cards;
    this.#emit();
    return this.getSnapshot();
  }

  updatePermission(kind: PermissionKind, state: PermissionState): AppSnapshot {
    this.#permissionCards = this.#permissionCards.map((card) => card.kind === kind ? {
      ...card,
      state,
      status: state === 'granted' ? 'implemented' : state === 'unsupported' ? 'unsupported' : state === 'not-tested' ? 'not-tested' : card.status,
      detail: `${card.detail} Latest state: ${state}.`,
    } : card);
    this.#emit();
    return this.getSnapshot();
  }

  enqueueMockDictation(options: MockPipelineOptions = {}): AppSnapshot {
    if (this.#queue.isRecordingActive) return this.getSnapshot();

    const recordingId = `recording-${this.#nextRecordingId}`;
    this.#nextRecordingId += 1;
    this.#activeRecordingId = recordingId;
    this.#recordingMode = 'mock';
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

  startRealRecording(_input: { readonly mimeType: string | null }): AppSnapshot {
    if (this.#queue.isRecordingActive) return this.getSnapshot();
    const recordingId = `recording-${this.#nextRecordingId}`;
    this.#nextRecordingId += 1;
    this.#activeRecordingId = recordingId;
    this.#recordingMode = 'real';
    this.#currentError = null;
    this.#queue.setRecordingActive(true);
    this.#emit();
    return this.getSnapshot();
  }

  submitRecordedAudio(input: RecordedAudioInput): AppSnapshot {
    const recordingId = this.#activeRecordingId ?? `recording-${this.#nextRecordingId++}`;
    this.#activeRecordingId = null;
    this.#recordingMode = 'real';
    this.#queue.setRecordingActive(false);
    const task = this.#runAudioJob(recordingId, {
      kind: 'memory',
      value: recordedAudioToDataUrl(input),
    }, {
      sttDelayMs: 0,
      llmDelayMs: 0,
      deliveryDelayMs: 0,
      glossary: [],
    });
    this.#track(task);
    this.#emit();
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
    try {
      await this.#audioAdapter.start();
      await this.#delay(options.recordingDelayMs);
      if (this.#canceledRecordingIds.delete(recordingId)) return;
      if (this.#activeRecordingId === recordingId) this.#activeRecordingId = null;

      const audio = await this.#audioAdapter.stop();
      await this.#runAudioJob(recordingId, { kind: 'mock', value: audio.audioRef || recordingId }, options);
    } catch (error) {
      this.#handlePipelineFailure(recordingId, null, error);
    }
  }

  async #runAudioJob(
    recordingId: string,
    audioRef: { readonly kind: 'mock' | 'memory' | 'file'; readonly value: string },
    options: Pick<Required<MockPipelineOptions>, 'sttDelayMs' | 'llmDelayMs' | 'deliveryDelayMs' | 'glossary'>,
  ): Promise<void> {
    let jobId: string | null = null;
    try {
      const settings = this.#settingsProvider();
      const job = this.#queue.enqueue({
        id: `${audioRef.kind === 'mock' ? 'mock' : 'real'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAtIso: new Date().toISOString(),
        snapshot: this.#createJobSnapshot(settings, options.glossary),
        targetContextId: audioRef.kind === 'mock' ? 'mock-target' : null,
      });
      jobId = job.id;
      this.#queue.setRecordingActive(false);
      this.#queue.transitionJob(job.id, 'transcribing');
      this.#currentError = null;
      this.#emit();

      await this.#delay(options.sttDelayMs);
      const sttProvider = this.#providerRouter.sttProvider();
      const transcription = await sttProvider.transcribe({
        jobId: job.id,
        sequence: job.sequence,
        language: job.snapshot.language,
        glossary: job.snapshot.glossary,
        audioRef,
      });
      this.#queue.transitionJob(job.id, 'correcting', { transcribedText: transcription.text });
      this.#emit();

      await this.#delay(options.llmDelayMs);
      const llmProvider = this.#providerRouter.llmProvider();
      const correction = await llmProvider.correct({
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
      const insertionResult = await this.#textInsertionAdapter.insertText(
        delivering.correctedText || delivering.transcribedText,
        delivering.targetContextId,
      );
      const terminalStatus = insertionResult === 'inserted' ? 'delivered' : 'copied-to-clipboard';
      const delivered = this.#queue.transitionJob(delivering.id, terminalStatus);
      const record = this.#historyRecord(delivered, terminalStatus);
      this.#history = [record, ...this.#history].slice(0, 20);
      await this.#historyStore?.append(record);
      this.#emit();
      next = this.#queue.nextDeliverableJob();
    }
  }

  #createJobSnapshot(settings: AppSettingsSnapshot, glossary: readonly string[] = []): DictationJobSnapshot {
    return {
      sttProviderType: settings.sttProviderType,
      llmProviderType: settings.llmProviderType,
      llmEnabled: settings.llmEnabled,
      correctionMode: settings.correctionMode,
      customPrompt: settings.customLLMPrompt,
      language: settings.language,
      glossary,
      domainWordSets: settings.domainWordSets,
      correctionMappings: settings.correctionMappings,
      screenshotContextEnabled: settings.screenshotContextEnabled,
      screenshotPasteEnabled: settings.screenshotPasteEnabled,
      vadEnabled: settings.vadEnabled,
    };
  }

  #jobToSnapshot(job: DictationJob): QueueItemSnapshot {
    return {
      id: `history-${job.sequence}`,
      sequence: job.sequence,
      status: job.status,
      originalText: job.transcribedText,
      correctedText: job.correctedText,
      isDeliverable: isDeliverableJobStatus(job.status),
      isProcessing: isProcessingJobStatus(job.status),
      isTerminal: isTerminalJobStatus(job.status),
    };
  }

  #historyRecord(job: DictationJob, status: HistoryRecordSnapshot['status']): HistoryRecordSnapshot {
    return {
      id: `history-${job.sequence}`,
      sequence: job.sequence,
      originalText: job.transcribedText,
      correctedText: job.correctedText,
      deliveredAtIso: new Date().toISOString(),
      status,
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

function recordedAudioToDataUrl(input: RecordedAudioInput): string {
  const bytes = Buffer.from(input.bytes);
  return `data:${input.mimeType};base64,${bytes.toString('base64')}`;
}
