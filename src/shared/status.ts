export const IMPLEMENTATION_STATUSES = ['mock', 'planned', 'partial', 'implemented', 'unsupported', 'not-tested'] as const;

export type ImplementationStatus = (typeof IMPLEMENTATION_STATUSES)[number];

export function isImplementationStatus(value: string): value is ImplementationStatus {
  return IMPLEMENTATION_STATUSES.includes(value as ImplementationStatus);
}
