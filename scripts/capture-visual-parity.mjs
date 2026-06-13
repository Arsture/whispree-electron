#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, '.omx/artifacts/visual-parity');
const electronShot = resolve(artifactRoot, 'electron-dashboard.png');
const verdictPath = resolve(artifactRoot, 'parity-verdict.md');
const dryRun = process.argv.includes('--dry-run');
mkdirSync(artifactRoot, { recursive: true });

if (!dryRun) {
  await captureElectron();
}

const swiftCandidates = [
  '/Applications/Whispree.app',
  resolve(repoRoot, '..', 'whispree', 'build', 'Whispree.app'),
  resolve(repoRoot, '..', 'whispree', 'DerivedData', 'Whispree.app'),
];
const swiftApp = swiftCandidates.find((candidate) => existsSync(candidate));
const electronExists = existsSync(electronShot);
const blockers = [];
if (!electronExists) blockers.push('electron-screenshot-missing-run-without-dry-run');
if (!swiftApp) blockers.push('swift-app-bundle-not-found-for-side-by-side-capture');

const markdown = `# Whispree Side-by-Side Visual Parity Verdict\n\nGenerated: ${new Date().toISOString()}\n\n## Artifacts\n\n- Electron screenshot: ${electronExists ? electronShot : 'missing'}\n- Swift app candidate: ${swiftApp ?? 'missing'}\n\n## Verdict\n\n${blockers.length === 0 ? 'Ready for manual/pixel side-by-side review. No pixel-perfect claim is made by this script.' : 'Blocked/not-tested for pixel parity. Do not claim pixel-perfect parity.'}\n\n## Blockers\n\n${blockers.length > 0 ? blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n\n## Required manual checklist\n\n- Sidebar tabs match Swift tab set, order, spacing, active and collapsed states.\n- Liquid/glassy material, card radius, blur, shadow, and accent colors match Swift reference.\n- Recording overlay status, waveform bars, hotkey badges, and queue/history states match Swift behavior.\n- Permission prompts and request affordances are present without exposing raw OS APIs to renderer.\n`;
writeFileSync(verdictPath, markdown, 'utf8');
console.log(JSON.stringify({ ok: true, dryRun, electronShot: electronExists ? electronShot : null, swiftApp: swiftApp ?? null, verdictPath, blockers }, null, 2));

async function captureElectron() {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npm', ['start'], {
      cwd: repoRoot,
      env: { ...process.env, WHISPREE_CAPTURE_SCREENSHOT: electronShot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error('Timed out capturing Electron screenshot.'));
    }, 45000);
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 || existsSync(electronShot)) resolvePromise(undefined);
      else rejectPromise(new Error(`Electron screenshot capture failed (${code}): ${stderr}`));
    });
    child.on('error', rejectPromise);
  });
}
