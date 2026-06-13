import { describe, expect, it } from 'vitest';
import { IMPLEMENTATION_STATUSES, isImplementationStatus } from './status';

describe('implementation status vocabulary', () => {
  it('uses the approved first-milestone vocabulary exactly', () => {
    expect(IMPLEMENTATION_STATUSES).toEqual(['mock', 'planned', 'unsupported', 'not-tested']);
  });

  it('guards unknown readiness claims', () => {
    expect(isImplementationStatus('mock')).toBe(true);
    expect(isImplementationStatus('ready')).toBe(false);
  });
});
