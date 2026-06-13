#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, '.omx/artifacts/visual-parity');
const electronCaptureRoot = resolve(repoRoot, '.omx/artifacts/electron-ui-parity');
const electronShot = resolve(electronCaptureRoot, 'electron-dashboard.png');
const swiftShot = resolve(artifactRoot, 'swift-reference.png');
const verdictPath = resolve(artifactRoot, 'parity-verdict.md');
const dryRun = process.argv.includes('--dry-run');
mkdirSync(artifactRoot, { recursive: true });
mkdirSync(electronCaptureRoot, { recursive: true });

const swiftCandidates = [
  '/Applications/Whispree.app',
  resolve(repoRoot, '..', 'whispree', 'build', 'Whispree.app'),
  resolve(repoRoot, '..', 'whispree', 'DerivedData', 'Whispree.app'),
];
const swiftApp = swiftCandidates.find((candidate) => existsSync(candidate));
const captureErrors = [];

if (!dryRun) {
  removeStaleCapture(electronShot);
  removeStaleCapture(swiftShot);
  await captureElectron().catch((error) => captureErrors.push(`electron-capture-failed: ${errorMessage(error)}`));
  if (swiftApp && process.platform === 'darwin') {
    await captureSwift(swiftApp).catch((error) => captureErrors.push(`swift-capture-failed: ${errorMessage(error)}`));
  }
}

const electronExists = existsSync(electronShot);
const swiftShotExists = existsSync(swiftShot);
const blockers = [...captureErrors];
if (dryRun) blockers.push('dry-run-did-not-capture-current-screenshots');
if (!electronExists) blockers.push('electron-screenshot-missing-run-without-dry-run');
if (!swiftApp) blockers.push('swift-app-bundle-not-found-for-side-by-side-capture');
else if (!swiftShotExists) blockers.push('swift-reference-screenshot-missing-run-without-dry-run-or-screen-permission');

const markdown = `# Whispree Side-by-Side Visual Parity Verdict\n\nGenerated: ${new Date().toISOString()}\n\n## Artifacts\n\n- Electron screenshot: ${electronExists ? electronShot : 'missing'}\n- Swift app candidate: ${swiftApp ?? 'missing'}\n- Swift screenshot: ${swiftShotExists ? swiftShot : 'missing'}\n\n## Verdict\n\n${blockers.length === 0 ? 'Ready for manual/pixel side-by-side review. No pixel-perfect claim is made by this script.' : 'Blocked/not-tested for pixel parity. Do not claim pixel-perfect parity.'}\n\n## Blockers\n\n${blockers.length > 0 ? blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n\n## Required manual checklist\n\n- Sidebar tabs match Swift tab set, order, spacing, active and collapsed states.\n- Liquid/glassy material, card radius, blur, shadow, and accent colors match Swift reference.\n- Recording overlay status, waveform bars, hotkey badges, and queue/history states match Swift behavior.\n- Permission prompts and request affordances are present without exposing raw OS APIs to renderer.\n`;
writeFileSync(verdictPath, markdown, 'utf8');
console.log(JSON.stringify({ ok: true, dryRun, electronShot: electronExists ? electronShot : null, swiftShot: swiftShotExists ? swiftShot : null, swiftApp: swiftApp ?? null, verdictPath, blockers }, null, 2));

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

async function captureSwift(appPath) {
  await exec('open', [appPath]);
  await exec('osascript', ['-e', 'tell application "Whispree" to activate']).catch(() => undefined);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1800));
  const bounds = await execOutput('osascript', ['-e', 'tell application "System Events" to tell process "Whispree" to get {position, size} of front window']);
  const region = parseAppleScriptBounds(bounds);
  await exec('screencapture', ['-x', '-R', region, swiftShot]);
  await exec('osascript', ['-e', 'tell application "Whispree" to quit']).catch(() => undefined);
}

async function exec(command, args) {
  await execOutput(command, args);
}

async function execOutput(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else rejectPromise(new Error(`${command} ${args.join(' ')} failed (${code}): ${stderr}`));
    });
    child.on('error', rejectPromise);
  });
}

function parseAppleScriptBounds(output) {
  const numbers = output.match(/-?\d+/gu)?.map(Number) ?? [];
  if (numbers.length < 4) throw new Error(`Unable to parse Whispree window bounds: ${output}`);
  const [x, y, width, height] = numbers;
  return `${x},${y},${width},${height}`;
}

function removeStaleCapture(filePath) {
  rmSync(filePath, { force: true });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
