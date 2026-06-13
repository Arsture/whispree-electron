#!/usr/bin/env node
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const electron = resolve(root, '.omx/artifacts/electron-ui-parity/electron-dashboard.png');
const swift = resolve(root, '.omx/artifacts/visual-parity/swift-reference.png');
const verdict = resolve(root, '.omx/artifacts/visual-parity/parity-verdict.md');
const verdictJson = resolve(root, '.omx/artifacts/visual-parity/parity-verdict.json');
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
const parsed = JSON.parse(readFileSync(verdictJson, 'utf8'));
for (const key of ['ok', 'claim', 'artifacts', 'blockers', 'checklist', 'swiftContract']) {
  if (!(key in parsed)) throw new Error(`JSON verdict missing ${key}`);
}
if (parsed.pixelPerfectClaimAllowed !== false) throw new Error('dry-run/default verdict must not allow pixel-perfect claims');
if (parsed.automatedPixelDiff?.implemented !== false) throw new Error('visual parity verdict must explicitly report that automated pixel diff is not implemented');
if (parsed.artifacts.swiftApp !== null) throw new Error('default verdict must not select /Applications/Whispree.app or any implicit Swift app path');
if (!parsed.blockers.includes('swift-reference-capture-requires-explicit-opt-in')) throw new Error('default run must keep Swift capture opt-in blocker');
for (const token of ['tabOrder', 'cssTokens', 'permissionRows', 'settingsAnchors', 'historyAnchors', 'contextSurfaces']) {
  if (!(token in parsed.swiftContract)) throw new Error(`swift contract missing ${token}`);
}
if (!parsed.swiftContract.cssTokens.cardRadius || !parsed.swiftContract.cssTokens.overlayWidth) {
  throw new Error('swift contract missing radius/overlay dimensions');
}
const explicitOutput = execFileSync('node', ['scripts/capture-visual-parity.mjs', '--dry-run'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, WHISPREE_CAPTURE_SWIFT_APP: '1' },
});
if (!explicitOutput.includes('swift-reference-capture-requires-explicit-app-path')) {
  throw new Error(`Swift capture opt-in without path must require explicit app path: ${explicitOutput}`);
}
const explicitParsed = JSON.parse(readFileSync(verdictJson, 'utf8'));
if (explicitParsed.artifacts.swiftApp !== null) throw new Error('Swift capture opt-in without WHISPREE_SWIFT_APP_PATH must not use implicit app candidates');
rmSync(electron, { force: true });
rmSync(swift, { force: true });
console.log('Visual parity dry-run stale-artifact and JSON contract guard passed.');
