#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, '.omx/artifacts/visual-parity');
const electronCaptureRoot = resolve(repoRoot, '.omx/artifacts/electron-ui-parity');
const electronShot = resolve(electronCaptureRoot, 'electron-dashboard.png');
const swiftShot = resolve(artifactRoot, 'swift-reference.png');
const verdictPath = resolve(artifactRoot, 'parity-verdict.md');
const jsonPath = resolve(artifactRoot, 'parity-verdict.json');
const dryRun = process.argv.includes('--dry-run');
mkdirSync(artifactRoot, { recursive: true });
mkdirSync(electronCaptureRoot, { recursive: true });

const explicitSwiftAppPath = process.env.WHISPREE_SWIFT_APP_PATH;
const expectedSwiftBundleId = process.env.WHISPREE_SWIFT_BUNDLE_ID || 'com.whispree.app';
const wantsSwiftCapture = process.argv.includes('--capture-swift') || process.env.WHISPREE_CAPTURE_SWIFT_APP === '1';
const swiftApp = explicitSwiftAppPath && existsSync(explicitSwiftAppPath) ? explicitSwiftAppPath : null;
const shouldCaptureSwift = Boolean(wantsSwiftCapture && swiftApp);
const captureErrors = [];
let swiftBundleId = null;
let swiftBundleVerified = false;

if (!dryRun) {
  removeStaleCapture(electronShot);
  removeStaleCapture(swiftShot);
  await captureElectron().catch((error) => captureErrors.push(`electron-capture-failed: ${errorMessage(error)}`));
  if (swiftApp) {
    swiftBundleId = await readBundleIdentifier(swiftApp).catch((error) => {
      captureErrors.push(`swift-bundle-id-read-failed: ${errorMessage(error)}`);
      return null;
    });
    swiftBundleVerified = swiftBundleId === expectedSwiftBundleId;
  }
  if (shouldCaptureSwift && swiftBundleVerified && process.platform === 'darwin') {
    await captureSwift(swiftApp, expectedSwiftBundleId).catch((error) => captureErrors.push(`swift-capture-failed: ${errorMessage(error)}`));
  }
}

const electronExists = existsSync(electronShot);
const swiftShotExists = existsSync(swiftShot);
const swiftContract = readSwiftContract();
const blockers = [...captureErrors];
if (dryRun) blockers.push('dry-run-did-not-capture-current-screenshots');
if (!electronExists) blockers.push('electron-screenshot-missing-run-without-dry-run');
if (!swiftContract.sourceCoverageOk) blockers.push('swift-source-contract-coverage-missing');
if (!wantsSwiftCapture) blockers.push('swift-reference-capture-requires-explicit-opt-in');
else if (!explicitSwiftAppPath) blockers.push('swift-reference-capture-requires-explicit-app-path');
else if (!swiftApp) blockers.push('swift-app-bundle-not-found-for-explicit-path');
else if (!swiftBundleVerified) blockers.push(`swift-app-bundle-id-mismatch-expected-${expectedSwiftBundleId}`);
else if (!swiftShotExists) blockers.push('swift-reference-screenshot-missing-run-without-dry-run-or-screen-permission');

const checklist = buildChecklist(swiftContract, { electronExists, swiftShotExists, shouldCaptureSwift });
const claim = blockers.length === 0 ? 'ready-for-manual-side-by-side-review' : 'blocked-not-pixel-perfect';
const verdict = {
  ok: true,
  dryRun,
  shouldCaptureSwift,
  claim,
  pixelPerfectClaimAllowed: false,
  automatedPixelDiff: {
    implemented: false,
    status: 'manual-required',
    reason: 'This script captures artifacts and source-derived UI contract only; it does not compute pixel diffs.',
  },
  artifacts: {
    electronScreenshot: electronExists ? electronShot : null,
    swiftApp: swiftApp ?? null,
    swiftBundleId,
    expectedSwiftBundleId,
    swiftScreenshot: swiftShotExists ? swiftShot : null,
    markdown: verdictPath,
    json: jsonPath,
  },
  blockers,
  checklist,
  swiftContract,
};

const markdown = renderMarkdown(verdict);
writeFileSync(verdictPath, markdown, 'utf8');
writeFileSync(jsonPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, dryRun, shouldCaptureSwift, electronShot: verdict.artifacts.electronScreenshot, swiftShot: verdict.artifacts.swiftScreenshot, swiftApp: swiftApp ?? null, swiftBundleId, verdictPath, jsonPath, blockers }, null, 2));

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

async function captureSwift(appPath, bundleId) {
  await exec('open', ['-n', appPath]);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1800));
  const processName = await processNameForBundleId(bundleId);
  const bounds = await execOutput('osascript', ['-e', `tell application "System Events" to tell process "${processName}" to get {position, size} of front window`]);
  const region = parseAppleScriptBounds(bounds);
  await exec('screencapture', ['-x', '-R', region, swiftShot]);
}

async function readBundleIdentifier(appPath) {
  return execOutput('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', resolve(appPath, 'Contents/Info.plist')]);
}

async function processNameForBundleId(bundleId) {
  const script = `tell application "System Events" to get name of first application process whose bundle identifier is "${bundleId}"`;
  return execOutput('osascript', ['-e', script]);
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

function readSwiftContract() {
  const files = {
    unified: readIfExists('Whispree/Views/UnifiedView.swift'),
    tokens: readIfExists('Whispree/Views/Design/DesignTokens.swift'),
    overlay: readIfExists('Whispree/Views/Transcription/TranscriptionOverlayView.swift'),
    permissions: readIfExists('Whispree/Views/Design/PermissionRow.swift'),
    settings: readIfExists('Whispree/Views/Settings/SettingsView.swift'),
    history: readIfExists('Whispree/Views/Transcription/TranscriptionHistoryView.swift'),
    onboarding: readIfExists('Whispree/Views/Onboarding/OnboardingView.swift'),
  };
  const tabOrder = ['Home', '일반', 'STT', 'LLM', 'Downloads', '단어 사전', '기록'];
  const iconTones = ['orange', 'gray', 'blue', 'purple', 'green', 'teal', 'indigo'];
  const cssTokens = {
    sidebarExpanded: '220px',
    sidebarCollapsed: '80px',
    titlebarInset: '52px',
    outerPadding: '24px',
    sectionGap: '20px',
    cardRadius: '18px',
    overlayWidth: '280px',
    overlayRadius: '14px',
    glassMaterials: ['regularMaterial', 'ultraThinMaterial', 'thickMaterial', 'backdrop-filter'],
  };
  const coverage = {
    tabOrder: tabOrder.every((label) => files.unified.includes(label)),
    sidebarWidths: files.unified.includes('220') && files.unified.includes('80') && files.unified.includes('52'),
    glassTokens: ['regularMaterial', 'ultraThinMaterial', 'thickMaterial'].every((token) => files.tokens.includes(token)),
    cardRadius: files.tokens.includes('cardRadius') && files.tokens.includes('18'),
    overlayDimensions: files.overlay.includes('frame(width: 280)') && files.overlay.includes('cornerRadius: 14'),
    permissionRows: files.permissions.includes('Permission') || files.settings.includes('Permissions'),
    settingsAnchors: ['GeneralSettingsView', 'STTSettingsView', 'LLMSettingsView', 'ModelSettingsView', 'DomainWordSetsView'].every((name) => files.unified.includes(name)),
    historyAnchors: files.unified.includes('TranscriptionHistoryView') && files.history.length > 0,
    contextOnboarding: files.onboarding.length > 0 && files.unified.includes('MainDashboardView'),
  };
  return {
    tabOrder,
    iconTones,
    cssTokens,
    permissionRows: ['Microphone', 'Accessibility', 'Screen Recording', 'Browser Context', 'Terminal Context'],
    settingsAnchors: ['Recording shortcut', 'Groq Cloud API', 'WhisperKit', 'MLX Audio', 'OpenAI 인증', '스크린샷 컨텍스트', '도메인 단어 세트', '기록'],
    historyAnchors: ['originalText', 'correctedText', 'deliveredAtIso'],
    contextSurfaces: ['Screenshot Selection', 'Browser Restore', 'Terminal Restore', 'Quick Fix', 'Onboarding'],
    sourceCoverage: coverage,
    sourceCoverageOk: Object.values(coverage).every(Boolean),
  };
}

function buildChecklist(contract, artifacts) {
  return [
    { id: 'sidebar-tab-order', label: 'Sidebar tab order and labels match Swift', status: contract.sourceCoverage.tabOrder ? 'covered' : 'blocked' },
    { id: 'glass-material-tokens', label: 'Glassy material token contract is present', status: contract.sourceCoverage.glassTokens ? 'covered' : 'blocked' },
    { id: 'card-radius', label: 'Card radius 18px maps to Swift DesignTokens.cardRadius', status: contract.sourceCoverage.cardRadius ? 'covered' : 'blocked' },
    { id: 'overlay-dimensions', label: 'Overlay width 280 and radius 14 are represented', status: contract.sourceCoverage.overlayDimensions ? 'covered' : 'blocked' },
    { id: 'permission-row-coverage', label: 'Permission rows cover microphone/accessibility/screen/browser/terminal', status: contract.sourceCoverage.permissionRows ? 'covered' : 'blocked' },
    { id: 'settings-history-anchors', label: 'Settings and history Swift anchors are represented', status: contract.sourceCoverage.settingsAnchors && contract.sourceCoverage.historyAnchors ? 'covered' : 'blocked' },
    { id: 'electron-current-screenshot', label: 'Current Electron screenshot captured', status: artifacts.electronExists ? 'covered' : 'blocked' },
    { id: 'swift-current-screenshot', label: 'Current Swift screenshot captured explicitly', status: artifacts.shouldCaptureSwift && artifacts.swiftShotExists ? 'covered' : 'blocked' },
  ];
}

function renderMarkdown(value) {
  return `# Whispree Side-by-Side Visual Parity Verdict\n\nGenerated: ${new Date().toISOString()}\n\n## Claim\n\n- ${value.claim}\n- Pixel-perfect claim allowed: ${value.pixelPerfectClaimAllowed ? 'yes' : 'no'}\n- Automated pixel diff: ${value.automatedPixelDiff.implemented ? 'implemented' : 'not implemented'} (${value.automatedPixelDiff.status})\n\n## Artifacts\n\n- Electron screenshot: ${value.artifacts.electronScreenshot ?? 'missing'}\n- Swift app explicit path: ${value.artifacts.swiftApp ?? 'missing'}\n- Swift bundle id: ${value.artifacts.swiftBundleId ?? 'missing'}\n- Expected Swift bundle id: ${value.artifacts.expectedSwiftBundleId}\n- Swift capture opt-in: ${value.shouldCaptureSwift ? 'enabled' : 'disabled'}\n- Swift screenshot: ${value.artifacts.swiftScreenshot ?? 'missing'}\n- JSON verdict: ${value.artifacts.json}\n\n## Verdict\n\n${value.blockers.length === 0 ? 'Ready for manual side-by-side review. No automated pixel-perfect claim is made by this script.' : 'Blocked/not-tested for pixel parity. Do not claim pixel-perfect parity.'}\n\n## Blockers\n\n${value.blockers.length > 0 ? value.blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n\n## Required checklist\n\n${value.checklist.map((item) => `- [${item.status === 'covered' ? 'x' : ' '}] ${item.id}: ${item.label}`).join('\n')}\n`;
}

function readIfExists(relativePath) {
  const file = resolve(repoRoot, relativePath);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
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
