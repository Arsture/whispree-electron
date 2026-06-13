import type { DictationJobStatus } from './queue';
import type { AppSettingsSnapshot, AppSettingsUpdate } from './settings';
import type { ImplementationStatus } from './status';

export const IPC_CHANNELS = {
  getAppSnapshot: 'whispree:get-app-snapshot',
  appSnapshotUpdated: 'whispree:app-snapshot-updated',
  enqueueMockDictation: 'whispree:enqueue-mock-dictation',
  cancelForegroundJob: 'whispree:cancel-foreground-job',
  openSettings: 'whispree:open-settings',
  requestPermission: 'whispree:request-permission',
  getSettings: 'whispree:get-settings',
  updateSettings: 'whispree:update-settings',
  resetSettings: 'whispree:reset-settings',
  copyHistoryText: 'whispree:copy-history-text',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

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


export type CommandAction =
  | 'enqueue-mock-dictation'
  | 'cancel-foreground-job'
  | 'open-settings'
  | 'request-permission'
  | 'get-settings'
  | 'update-settings'
  | 'reset-settings'
  | 'copy-history-text';

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
      status: 'planned',
      platform: 'macos',
      detail: 'Future sidecar path based on the copied MLX worker protocols.',
    },
    {
      id: 'windows-local-ai',
      label: 'Windows local AI backend',
      family: 'local-backend',
      status: 'not-tested',
      platform: 'windows',
      detail: 'Interface planned; runtime backend not selected or executed yet.',
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
      state: 'not-tested',
      status: 'planned',
      detail: 'Required later for hotkey/text insertion adapters.',
    },
    {
      kind: 'screen-recording',
      label: 'Screen Recording',
      state: 'not-tested',
      status: 'planned',
      detail: 'Required later for screenshot/VLM context.',
    },
    {
      kind: 'browser-context',
      label: 'Browser Context',
      state: 'not-tested',
      status: 'planned',
      detail: 'Chrome restore is a future OS adapter, not renderer logic.',
    },
    {
      kind: 'terminal-context',
      label: 'Terminal Context',
      state: 'not-tested',
      status: 'planned',
      detail: 'iTerm/tmux restore is a future OS adapter.',
    },
  ],
  history: [],
  currentError: null,
};
