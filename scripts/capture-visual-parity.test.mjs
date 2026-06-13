#!/usr/bin/env node
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const electron = resolve(root, '.omx/artifacts/electron-ui-parity/electron-dashboard.png');
const swift = resolve(root, '.omx/artifacts/visual-parity/swift-reference.png');
const verdict = resolve(root, '.omx/artifacts/visual-parity/parity-verdict.md');
mkdirSync(resolve(root, '.omx/artifacts/electron-ui-parity'), { recursive: true });
mkdirSync(resolve(root, '.omx/artifacts/visual-parity'), { recursive: true });
writeFileSync(electron, 'stale-electron');
writeFileSync(swift, 'stale-swift');
const output = execFileSync('node', ['scripts/capture-visual-parity.mjs', '--dry-run'], { cwd: root, encoding: 'utf8' });
if (!output.includes('dry-run-did-not-capture-current-screenshots')) {
  throw new Error(`dry-run did not report blocker: ${output}`);
}
if (!readFileSync(verdict, 'utf8').includes('Blocked/not-tested for pixel parity')) {
  throw new Error('dry-run verdict did not remain blocked/not-tested');
}
rmSync(electron, { force: true });
rmSync(swift, { force: true });
console.log('Visual parity dry-run stale-artifact guard passed.');
