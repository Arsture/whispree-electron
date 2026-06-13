#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const packagedApp = resolve(repoRoot, 'out/Whispree-darwin-arm64/Whispree.app');
const executable = resolve(packagedApp, 'Contents/MacOS/Whispree');
const smokeRoot = resolve(repoRoot, '.omx/artifacts/packaged-app-smoke');
const screenshot = resolve(smokeRoot, 'packaged-app.png');

if (process.platform !== 'darwin') {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'packaged .app smoke is macOS-only in this workspace.' }, null, 2));
  process.exit(0);
}

if (!existsSync(executable)) {
  console.error(JSON.stringify({ ok: false, error: 'Packaged app executable missing. Run npm run package first.', executable }, null, 2));
  process.exit(1);
}

mkdirSync(smokeRoot, { recursive: true });
try {
  execFileSync(executable, [], {
    cwd: repoRoot,
    env: {
      ...process.env,
      WHISPREE_CAPTURE_SCREENSHOT: screenshot,
      WHISPREE_REPO_ROOT: repoRoot,
      WHISPREE_ALLOW_PACKAGED_SCREENSHOT: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 45000,
  });
} catch (error) {
  console.error(JSON.stringify({ ok: false, executable, screenshot, error: errorMessage(error), stderr: error?.stderr?.toString?.() ?? '' }, null, 2));
  process.exit(1);
}

if (!existsSync(screenshot)) {
  console.error(JSON.stringify({ ok: false, executable, screenshot, error: 'Packaged app exited without writing smoke screenshot.' }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, executable, screenshot }, null, 2));

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
