import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SWIFT_PARITY_CSS_CONTRACT } from '../renderer/ui-model';

describe('renderer CSS Swift parity contract', () => {
  it('contains the concrete Swift-derived sizing tokens', () => {
    const css = readFileSync('src/renderer/styles.css', 'utf8');
    for (const value of Object.values(SWIFT_PARITY_CSS_CONTRACT)) {
      expect(css).toContain(value);
    }
    expect(css).toContain('--sidebar-expanded');
    expect(css).toContain('--titlebar-inset');
    expect(css).toContain('--overlay-width');
    expect(css).toContain('backdrop-filter');
  });
});
