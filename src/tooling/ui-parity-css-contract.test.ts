import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SWIFT_PARITY_CSS_CONTRACT } from '../renderer/ui-model';

function cssSource(...relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(join(process.cwd(), relativePath), 'utf8')).join('\n');
}

describe('UI parity CSS source contract', () => {
  it('keeps the Swift dimension, material, and token CSS contract in renderer styles', () => {
    const css = cssSource(
      'src/renderer/styles.css',
      'src/renderer/styles/tokens.css',
      'src/renderer/styles/components.css',
      'src/renderer/styles/shell.css',
      'src/renderer/styles/overlay.css',
    );

    const expectedVariables = {
      '--sidebar-expanded': SWIFT_PARITY_CSS_CONTRACT.sidebarExpanded,
      '--sidebar-collapsed': SWIFT_PARITY_CSS_CONTRACT.sidebarCollapsed,
      '--titlebar-inset': SWIFT_PARITY_CSS_CONTRACT.titlebarInset,
      '--outer-padding': SWIFT_PARITY_CSS_CONTRACT.outerPadding,
      '--section-gap': SWIFT_PARITY_CSS_CONTRACT.sectionGap,
      '--card-radius': SWIFT_PARITY_CSS_CONTRACT.cardRadius,
      '--overlay-width': SWIFT_PARITY_CSS_CONTRACT.overlayWidth,
      '--overlay-radius': SWIFT_PARITY_CSS_CONTRACT.overlayRadius,
    } as const;

    for (const [name, value] of Object.entries(expectedVariables)) {
      expect(css).toContain(`${name}: ${value};`);
    }
    for (const token of [
      '--surface-card-material',
      '--surface-inset-material',
      '--surface-editor-material',
      '--surface-overlay-material',
      'backdrop-filter: blur',
      '.liquid-card',
      '.status-badge',
      '.permission-row',
      '.metric-label',
    ]) {
      expect(css).toContain(token);
    }
  });
});
