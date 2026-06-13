import type { CSSProperties, ReactNode } from 'react';
import type { BadgeTone } from '../ui-model';

export function StatusPill({ children, tone, status }: { readonly children: ReactNode; readonly tone: BadgeTone; readonly status?: string }) {
  return (
    <span className="status-pill" data-tone={tone} data-status={status ?? tone}>
      {children}
    </span>
  );
}

export function Keycap({ children }: { readonly children: ReactNode }) {
  return <kbd className="keycap">{children}</kbd>;
}

export function HotkeyBadge({ id, label, keys, active = false }: { readonly id: string; readonly label: string; readonly keys: string; readonly active?: boolean }) {
  return (
    <span className="hotkey-badge" data-hotkey={id} data-active={active}>
      <span>{label}</span>
      <Keycap>{keys}</Keycap>
    </span>
  );
}

export function Waveform({ active = false }: { readonly active?: boolean }) {
  return (
    <div className="waveform" data-active={active} aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <span key={index} style={{ '--bar': `${20 + ((index * 13) % 44)}%` } as CSSProperties} />
      ))}
    </div>
  );
}
