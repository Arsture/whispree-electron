import type { AppSnapshot, PermissionCardSnapshot, ProviderCardSnapshot, QueueItemSnapshot } from '../shared/ipc';

export type SidebarSectionId = 'home' | 'general' | 'stt' | 'llm' | 'models' | 'word-sets' | 'history';
export type IconTone = 'orange' | 'gray' | 'blue' | 'purple' | 'green' | 'teal' | 'indigo';
export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export interface SidebarSectionDefinition {
  readonly id: SidebarSectionId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly swiftIcon: string;
  readonly iconTone: IconTone;
}

export interface PlaceholderGroup {
  readonly title: string;
  readonly rows: readonly string[];
  readonly status: 'mock' | 'planned' | 'not-tested';
}

export const SWIFT_PARITY_CSS_CONTRACT = {
  sidebarExpanded: '220px',
  sidebarCollapsed: '80px',
  titlebarInset: '52px',
  outerPadding: '24px',
  sectionGap: '20px',
  cardRadius: '18px',
  overlayWidth: '280px',
  overlayRadius: '14px',
} as const;

export const SIDEBAR_SECTIONS: readonly SidebarSectionDefinition[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: '⌂', swiftIcon: 'house.fill', iconTone: 'orange' },
  { id: 'general', label: '일반', shortLabel: '일반', icon: '⚙', swiftIcon: 'gearshape', iconTone: 'gray' },
  { id: 'stt', label: 'STT', shortLabel: 'STT', icon: '●', swiftIcon: 'mic.fill', iconTone: 'blue' },
  { id: 'llm', label: 'LLM', shortLabel: 'LLM', icon: '✦', swiftIcon: 'brain', iconTone: 'purple' },
  { id: 'models', label: 'Downloads', shortLabel: 'DL', icon: '↓', swiftIcon: 'arrow.down.circle.fill', iconTone: 'green' },
  { id: 'word-sets', label: '단어 사전', shortLabel: '사전', icon: '文', swiftIcon: 'text.book.closed.fill', iconTone: 'teal' },
  { id: 'history', label: '기록', shortLabel: '기록', icon: '◷', swiftIcon: 'clock.fill', iconTone: 'indigo' },
] as const;

export const SWIFT_SETTINGS_TABS = [
  { label: 'General', swiftIcon: 'gear' },
  { label: 'STT', swiftIcon: 'mic.fill' },
  { label: 'LLM', swiftIcon: 'text.badge.checkmark' },
  { label: '모델', swiftIcon: 'arrow.down.circle' },
  { label: '단어 사전', swiftIcon: 'text.book.closed' },
] as const;

export const SETTINGS_PLACEHOLDERS: Record<Exclude<SidebarSectionId, 'home' | 'history'>, readonly PlaceholderGroup[]> = {
  general: [
    {
      title: 'Hotkey',
      status: 'planned',
      rows: ['Recording shortcut', 'Quick Fix shortcut', 'Recording Mode', 'Audio Input', 'Language'],
    },
    {
      title: 'Context restore',
      status: 'planned',
      rows: ['Dictionary Sync', 'Browser Restoration', 'Terminal Restoration'],
    },
    {
      title: 'General',
      status: 'planned',
      rows: ['Show transcription overlay', 'Launch at login', 'Permissions', 'Automation 권한'],
    },
  ],
  stt: [
    {
      title: '음성 인식 엔진',
      status: 'planned',
      rows: ['Groq Cloud API', 'Parakeet MLX / mlx-audio', 'WhisperKit'],
    },
    {
      title: 'API / VAD',
      status: 'planned',
      rows: ['API Key', '콜드 스타트 중', '다운로드 탭에서 모델을 다운로드하세요', '무음 자동 스킵'],
    },
  ],
  llm: [
    {
      title: '교정 엔진',
      status: 'planned',
      rows: ['Provider', '로컬 모델', 'OpenAI 모델', 'Groq 모델'],
    },
    {
      title: 'Context and auth',
      status: 'planned',
      rows: ['Groq API Key', '스크린샷 컨텍스트', '에이전트에 전달', 'OpenAI 인증'],
    },
    {
      title: 'Prompting',
      status: 'planned',
      rows: ['교정 모드', '시스템 프롬프트'],
    },
  ],
  models: [
    {
      title: 'STT 모델',
      status: 'planned',
      rows: ['WhisperKit Large V3 Turbo', 'Parakeet MLX', '다운로드', '준비됨'],
    },
    {
      title: 'LLM 모델',
      status: 'planned',
      rows: ['Vision', '사용 중', '취소', '삭제', '재시도'],
    },
    {
      title: '저장 공간',
      status: 'not-tested',
      rows: ['모델 위치', '~/.cache/huggingface/hub/', 'Finder에서 열기'],
    },
  ],
  'word-sets': [
    {
      title: '도메인 단어 세트',
      status: 'planned',
      rows: ['도메인 단어 세트', '등록된 단어 세트가 없습니다', '기본 세트 추가', 'IT/Dev', 'API, React, Docker, LLM'],
    },
    {
      title: 'Words and mappings',
      status: 'planned',
      rows: ['단어', 'STT + LLM', '교정 매핑', 'LLM only', '새 단어 추가', '올바른 단어'],
    },
  ],
};

export function sectionIds(): readonly SidebarSectionId[] {
  return SIDEBAR_SECTIONS.map((section) => section.id);
}


export type TabNavigationKey = 'ArrowDown' | 'ArrowRight' | 'ArrowUp' | 'ArrowLeft' | 'Home' | 'End';

export function nextSectionId(current: SidebarSectionId, key: TabNavigationKey): SidebarSectionId {
  const ids = sectionIds();
  const index = ids.indexOf(current);
  if (key === 'Home') return ids[0]!;
  if (key === 'End') return ids[ids.length - 1]!;
  const delta = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1;
  const nextIndex = (index + delta + ids.length) % ids.length;
  return ids[nextIndex]!;
}

export function statusTitle(snapshot: AppSnapshot): string {
  if (snapshot.recording.active) return snapshot.recording.label;
  if ((snapshot.queue.processingCount ?? 0) > 0) {
    return snapshot.recording.mode === 'real' ? 'Processing microphone dictation queue' : 'Processing dictation queue';
  }
  return 'Ready — press hotkey to record';
}

export function statusTone(snapshot: AppSnapshot): BadgeTone {
  if (snapshot.recording.active) return 'danger';
  if (snapshot.appStatus === 'processing' || snapshot.queue.processingCount > 0) return 'warning';
  if (snapshot.appStatus === 'ready') return 'success';
  return 'neutral';
}

export function queueProcessingText(snapshot: AppSnapshot): string {
  const active = snapshot.queue.processingCount + snapshot.queue.deliveryReadyCount;
  if (active > 1) return `${active} dictations in queue · insertion remains FIFO`;
  if (snapshot.queue.processingCount === 1) {
    return snapshot.recording.mode === 'real' ? 'Processing your microphone dictation…' : 'Processing your dictation…';
  }
  return 'Queue is calm and ready.';
}

export function overlayStatusText(snapshot: AppSnapshot): string {
  if (snapshot.recording.active) return snapshot.queue.totalCount > 0 ? `Recording · ${snapshot.queue.totalCount} queued` : 'Recording…';
  if (snapshot.queue.processingCount > 1) return `Processing ${snapshot.queue.processingCount} items`;
  if (snapshot.queue.processingCount === 1) return 'Processing foreground item';
  if (snapshot.queue.deliveryReadyCount > 0) return 'Ready to insert queued result';
  return snapshot.latest ? 'Inserted latest dictation' : 'Idle';
}

export function foregroundCancelLabel(snapshot: AppSnapshot): string | null {
  const sequence = snapshot.queue.foregroundJobSequence;
  if (!sequence) return null;
  if (snapshot.recording.active) return 'Cancel';
  if (snapshot.queue.processingCount > 0 || snapshot.queue.deliveryReadyCount > 0) return `Cancel #${sequence}`;
  return null;
}

export function implementationTone(status: ProviderCardSnapshot['status'] | PermissionCardSnapshot['status']): BadgeTone {
  switch (status) {
    case 'mock':
      return 'accent';
    case 'planned':
    case 'partial':
      return 'warning';
    case 'implemented':
      return 'success';
    case 'unsupported':
      return 'danger';
    case 'not-tested':
      return 'neutral';
  }
}

export function jobLabel(job: QueueItemSnapshot): string {
  return `#${job.sequence} · ${job.status}`;
}
