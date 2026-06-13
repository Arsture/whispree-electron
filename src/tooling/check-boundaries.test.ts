import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('boundary checker', () => {
  it('rejects forbidden re-export sources from shared files', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'whispree-boundary-'));
    try {
      mkdirSync(path.join(root, 'src/shared'), { recursive: true });
      mkdirSync(path.join(root, 'src/renderer'), { recursive: true });
      writeFileSync(path.join(root, 'src/shared/leak.ts'), "export { app } from 'electron';\n");
      const result = spawnSync(process.execPath, [path.resolve('scripts/check-boundaries.mjs')], {
        cwd: process.cwd(),
        env: { ...process.env, BOUNDARY_ROOT: root },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Boundary violations detected');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
