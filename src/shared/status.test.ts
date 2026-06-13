import { describe, expect, it } from 'vitest';
import { IMPLEMENTATION_STATUSES, isImplementationStatus } from './status';

describe('implementation status vocabulary', () => {
  it('uses an evidence-aware readiness vocabulary', () => {
    expect(IMPLEMENTATION_STATUSES).toEqual(['mock', 'planned', 'partial', 'implemented', 'unsupported', 'not-tested']);
  });

  it('guards unknown readiness claims', () => {
    expect(isImplementationStatus('mock')).toBe(true);
    expect(isImplementationStatus('implemented')).toBe(true);
    expect(isImplementationStatus('ready')).toBe(false);
  });
});
