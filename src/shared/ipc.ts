import type { DictationJobStatus } from './queue';
import type { AppSettingsSnapshot, AppSettingsUpdate } from './settings';
import type { ImplementationStatus } from './status';

export const IPC_CHANNELS = {
  getAppSnapshot: 'whispree:get-app-snapshot',
  appSnapshotUpdated: 'whispree:app-snapshot-updated',
  recordingHotkey: 'whispree:recording-hotkey',
  enqueueMockDictation: 'whispree:enqueue-mock-dictation',
  startRealRecording: 'whispree:start-real-recording',
  submitRecordedAudio: 'whispree:submit-recorded-audio',
  cancelForegroundJob: 'whispree:cancel-foreground-job',
  openSettings: 'whispree:open-settings',
  requestPermission: 'whispree:request-permission',
  getSettings: 'whispree:get-settings',
  updateSettings: 'whispree:update-settings',
  resetSettings: 'whispree:reset-settings',
  copyHistoryText: 'whispree:copy-history-text',
  clearHistory: 'whispree:clear-history',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type RecordingHotkeyCommand = 'start-real-recording' | 'stop-real-recording';

export interface RecordingHotkeyMessage {
  readonly command: RecordingHotkeyCommand;
}

export const PERMISSION_KINDS = [
  'microphone',
  'accessibility',
  'screen-recording',
  'browser-context',
  'terminal-context',
] as const;

export type PermissionKind = (typeof PERMISSION_KINDS)[number];

export function isPermissionKind(value: unknown): value is PermissionKind {
  return typeof value === 'string' && PERMISSION_KINDS.includes(value as PermissionKind);
}

export type PermissionState =
  | 'granted'
  | 'denied'
  | 'prompt-required'
  | 'unsupported'
  | 'manual-required'
  | 'not-tested'
  | 'mock';

export interface PermissionCardSnapshot {
  readonly kind: PermissionKind;
  readonly label: string;
  readonly state: PermissionState;
  readonly status: ImplementationStatus;
  readonly detail: string;
}

export interface ProviderCardSnapshot {
  readonly id: string;
  readonly label: string;
  readonly family: 'stt' | 'llm' | 'local-backend' | 'cloud-backend';
  readonly status: ImplementationStatus;
  readonly platform: 'cross-platform' | 'macos' | 'windows' | 'linux' | 'unknown';
  readonly detail: string;
}

export interface QueueItemSnapshot {
  readonly id: string;
  readonly sequence: number;
  readonly status: DictationJobStatus;
  readonly originalText: string;
  readonly correctedText: string;
  readonly targetContextId: string | null;
  readonly screenshotIds: readonly string[];
  readonly isDeliverable: boolean;
  readonly isProcessing: boolean;
  readonly isTerminal: boolean;
}

export interface QueueSnapshot {
  readonly totalCount: number;
  readonly processingCount: number;
  readonly deliveryReadyCount: number;
  readonly terminalCount: number;
  readonly isRecordingActive: boolean;
  readonly activeDeliverySequence: number | null;
  readonly foregroundJobSequence: number | null;
  readonly items: readonly QueueItemSnapshot[];
}

export interface HistoryRecordSnapshot {
  readonly id: string;
  readonly sequence: number;
  readonly originalText: string;
  readonly correctedText: string;
  readonly deliveredAtIso: string;
  readonly status: 'delivered' | 'copied-to-clipboard' | 'failed' | 'canceled' | 'skipped';
}

export interface AppSnapshot {
  readonly appStatus: 'ready' | 'recording' | 'processing' | 'needs-permission';
  readonly recording: {
    readonly active: boolean;
    readonly mode: 'mock' | 'real';
    readonly label: string;
  };
  readonly queue: QueueSnapshot;
  readonly latest: {
    readonly originalText: string;
    readonly correctedText: string;
  } | null;
  readonly providers: readonly ProviderCardSnapshot[];
  readonly permissions: readonly PermissionCardSnapshot[];
  readonly history: readonly HistoryRecordSnapshot[];
  readonly currentError: { readonly message: string } | null;
}

export interface RecordedAudioInput {
  readonly bytes: ArrayBuffer;
  readonly mimeType: string;
  readonly durationMs: number;
}

export interface RealRecordingStartInput {
  readonly mimeType: string | null;
}

export type CommandAction =
  | 'enqueue-mock-dictation'
  | 'start-real-recording'
  | 'submit-recorded-audio'
  | 'cancel-foreground-job'
  | 'open-settings'
  | 'request-permission'
  | 'get-settings'
  | 'update-settings'
  | 'reset-settings'
  | 'copy-history-text'
  | 'clear-history';

export interface CommandError {
  readonly code: 'invalid-input' | 'unsupported' | 'not-implemented';
  readonly message: string;
}

export type CommandResult =
  | {
      readonly ok: true;
      readonly action: CommandAction;
      readonly snapshot: AppSnapshot;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly action: CommandAction;
      readonly snapshot: AppSnapshot;
      readonly error: CommandError;
    };


export type SettingsCommandAction = 'get-settings' | 'update-settings' | 'reset-settings';

export type SettingsCommandResult =
  | {
      readonly ok: true;
      readonly action: SettingsCommandAction;
      readonly settings: AppSettingsSnapshot;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly action: SettingsCommandAction;
      readonly settings: AppSettingsSnapshot;
      readonly error: CommandError;
    };

export type SettingsUpdateInput = AppSettingsUpdate;
export type HistoryTextVariant = 'original' | 'corrected';

export const initialQueueSnapshot: QueueSnapshot = {
  totalCount: 0,
  processingCount: 0,
  deliveryReadyCount: 0,
  terminalCount: 0,
  isRecordingActive: false,
  activeDeliverySequence: null,
  foregroundJobSequence: null,
  items: [],
};

export const initialAppSnapshot: AppSnapshot = {
  appStatus: 'ready',
  recording: {
    active: false,
    mode: 'mock',
    label: 'Ready for mock recording',
  },
  queue: initialQueueSnapshot,
  latest: null,
  providers: [
    {
      id: 'mock-stt',
      label: 'Mock STT',
      family: 'stt',
      status: 'mock',
      platform: 'cross-platform',
      detail: 'Deterministic scaffold provider; no microphone or cloud request.',
    },
    {
      id: 'mock-llm',
      label: 'Mock Correction',
      family: 'llm',
      status: 'mock',
      platform: 'cross-platform',
      detail: 'Deterministic correction placeholder; real AI is deferred.',
    },
    {
      id: 'macos-mlx',
      label: 'macOS MLX sidecar',
      family: 'local-backend',
      status: 'partial',
      platform: 'macos',
      detail: 'macOS-only local AI sidecar seam for MLX/WhisperKit; command availability is probed at runtime.',
    },
    {
      id: 'windows-whisper-cpp-directml',
      label: 'Windows whisper.cpp DirectML',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows STT sidecar candidate; configured with WHISPREE_WINDOWS_WHISPER_CPP_COMMAND and never uses MLX.',
    },
    {
      id: 'windows-llama-cpp-vulkan',
      label: 'Windows llama.cpp Vulkan/CUDA',
      family: 'local-backend',
      status: 'partial',
      platform: 'windows',
      detail: 'Windows correction/VLM sidecar candidate; configured with WHISPREE_WINDOWS_LLAMA_CPP_COMMAND and never uses MLX.',
    },
  ],
  permissions: [
    {
      kind: 'microphone',
      label: 'Microphone',
      state: 'mock',
      status: 'mock',
      detail: 'Mock recording does not request microphone access.',
    },
    {
      kind: 'accessibility',
      label: 'Accessibility',
      state: 'manual-required',
      status: 'partial',
      detail: 'Runtime adapter opens OS settings/manual grant flow for global shortcuts and text insertion.',
    },
    {
      kind: 'screen-recording',
      label: 'Screen Recording',
      state: 'manual-required',
      status: 'partial',
      detail: 'Runtime adapter opens OS settings/manual grant flow for screenshot and visual context capture.',
    },
    {
      kind: 'browser-context',
      label: 'Browser Context',
      state: 'manual-required',
      status: 'partial',
      detail: 'Runtime adapter exposes typed OS-specific browser context capability and manual setup status.',
    },
    {
      kind: 'terminal-context',
      label: 'Terminal Context',
      state: 'manual-required',
      status: 'partial',
      detail: 'Runtime adapter exposes typed OS-specific terminal context capability and manual setup status.',
    },
  ],
  history: [],
  currentError: null,
};
