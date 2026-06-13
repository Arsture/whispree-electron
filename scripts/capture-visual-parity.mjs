#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, '.omx/artifacts/visual-parity');
const electronCaptureRoot = resolve(repoRoot, '.omx/artifacts/electron-ui-parity');
const electronShot = resolve(electronCaptureRoot, 'electron-dashboard.png');
const electronDomReport = resolve(electronCaptureRoot, 'electron-dashboard-dom.json');
const electronUserDataDir = resolve(electronCaptureRoot, 'electron-user-data');
const packagedExecutable = resolve(repoRoot, 'out/Whispree-darwin-arm64/Whispree.app/Contents/MacOS/Whispree');
const swiftShot = resolve(artifactRoot, 'swift-reference.png');
const verdictPath = resolve(artifactRoot, 'parity-verdict.md');
const jsonPath = resolve(artifactRoot, 'parity-verdict.json');
const dryRun = process.argv.includes('--dry-run');

const registryPath = resolve(repoRoot, 'docs/UI_PARITY_TASK_REGISTRY.md');
const swiftSourceRoot = process.env.WHISPREE_SWIFT_SOURCE_ROOT || '/Users/arsture/ideas/whispree';
const swiftViewsRoot = resolve(swiftSourceRoot, 'Whispree/Views');

const uiTaskContracts = [
  {
    id: 'UI-01',
    title: 'Design tokens and shared primitives',
    swiftSources: [
      'Views/Design/DesignTokens.swift',
      'Views/Design/SettingsCard.swift',
      'Views/Design/SettingsRow.swift',
      'Views/Design/StatusBadge.swift',
      'Views/Design/CompatibilityBadge.swift',
      'Views/Design/ModelMetricsView.swift',
      'Views/Design/PermissionRow.swift',
    ],
    anchors: ['DesignTokens', 'SettingsCard', 'SettingsRow', 'StatusBadge', 'CompatibilityBadge', 'ModelMetricsView', 'PermissionRow'],
  },
  {
    id: 'UI-02',
    title: 'Unified shell, titlebar spacer, sidebar/tab navigation',
    swiftSources: ['Views/UnifiedView.swift', 'Views/Settings/SettingsView.swift'],
    anchors: ['SidebarSection', 'Home', 'Downloads', '단어 사전', '기록', 'frame(width: sidebarWidth)', 'Color.clear.frame(height: 52)'],
  },
  {
    id: 'UI-03',
    title: 'Home dashboard main content',
    swiftSources: ['Views/Dashboard/MainDashboardView.swift'],
    anchors: ['Whispree', 'Accessibility 권한 필요', 'Last Transcription', '스크린 컨텍스트', 'Providers'],
  },
  {
    id: 'UI-04',
    title: 'Transcription overlay and waveform mock',
    swiftSources: ['Views/Transcription/TranscriptionOverlayView.swift'],
    anchors: ['TranscriptionOverlayView', 'NeonWaveformView', 'frame(width: 280)', 'regularMaterial', 'cornerRadius: 14'],
  },
  {
    id: 'UI-05',
    title: 'Settings shared layout and General tab',
    swiftSources: [
      'Views/Settings/SettingsView.swift',
      'Views/Settings/GeneralSettingsView.swift',
      'Views/Settings/ShortcutRecorderButton.swift',
      'Views/Design/PermissionRow.swift',
    ],
    anchors: ['GeneralSettingsView', 'Hotkey', 'Permissions', '브라우저 복원', '터미널 복원', 'ShortcutRecorderButton'],
  },
  {
    id: 'UI-06',
    title: 'STT settings tab',
    swiftSources: ['Views/Settings/STTSettingsView.swift', 'Views/Design/ModelMetricsView.swift'],
    anchors: ['STTProviderRow', 'Groq', 'WhisperKit', 'MLX', '콜드 스타트', 'VAD'],
  },
  {
    id: 'UI-07',
    title: 'LLM settings tab',
    swiftSources: ['Views/Settings/LLMSettingsView.swift'],
    anchors: ['LLMSettingsView', 'OpenAI', 'Groq', '스크린샷', 'System Prompt'],
  },
  {
    id: 'UI-08',
    title: 'Downloads / model management tab',
    swiftSources: ['Views/Settings/ModelSettingsView.swift', 'Views/Design/CompatibilityBadge.swift', 'Views/Design/ModelMetricsView.swift'],
    anchors: ['ModelSettingsView', 'CompatibilityBadge', 'ModelMetricsView', '다운로드'],
  },
  {
    id: 'UI-09',
    title: 'Domain word sets tab',
    swiftSources: ['Views/Settings/DomainWordSetsView.swift'],
    anchors: ['DomainWordSetsView', '도메인', '단어'],
  },
  {
    id: 'UI-10',
    title: 'History tab',
    swiftSources: ['Views/Transcription/TranscriptionHistoryView.swift'],
    anchors: ['TranscriptionHistoryView', 'Clear All', 'originalText', 'correctedText'],
  },
  {
    id: 'UI-11',
    title: 'Onboarding shell and steps',
    swiftSources: ['Views/Onboarding/OnboardingView.swift'],
    anchors: ['OnboardingView', 'Welcome to Whispree', 'Permissions', '서비스 연동', '녹음 방법', 'Quick Fix', 'frame(width: 480, height: 640)'],
  },
  {
    id: 'UI-12',
    title: 'Quick Fix panel',
    swiftSources: ['Views/QuickFix/QuickFixPanelView.swift'],
    anchors: ['QuickFixPanelView', 'Quick Fix', '선택된 텍스트', '저장될 매핑', 'frame(width: 440)'],
  },
  {
    id: 'UI-13',
    title: 'Screenshot selection overlay',
    swiftSources: ['Views/ScreenshotSelectionView.swift', 'Views/Dashboard/MainDashboardView.swift'],
    anchors: ['ScreenshotSelectionView', '스크린샷 선택', 'selectedIndices', 'screenshotOverlay', 'appName'],
  },
  {
    id: 'UI-14',
    title: 'Menu bar popover',
    swiftSources: ['Views/MenuBar/MenuBarView.swift'],
    anchors: ['MenuBarView', 'Status', 'Last transcription', 'Controls', 'Settings...', 'frame(width: 320)'],
  },
  {
    id: 'UI-15',
    title: 'Swift source contract extraction/test reinforcement',
    swiftSources: ['Views/**/*.swift'],
    anchors: ['UI-15'],
  },
  {
    id: 'UI-16',
    title: 'Renderer DOM/visual contract tests',
    swiftSources: ['docs/UI_PARITY_TASK_REGISTRY.md'],
    anchors: ['UI-16'],
  },
  {
    id: 'UI-17',
    title: 'CSS responsive/accessibility polish',
    swiftSources: ['Views/Design/DesignTokens.swift'],
    anchors: ['DesignTokens', 'TextRole', 'semanticColors'],
  },
  {
    id: 'UI-18',
    title: 'Final packaged UI smoke and screenshot artifacts',
    swiftSources: ['.omx/artifacts/visual-parity/*', '.omx/artifacts/electron-ui-parity/*'],
    anchors: ['UI-18'],
  },
];
const expectedUiTaskIds = uiTaskContracts.map((task) => task.id);
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
  removeStaleCapture(electronDomReport);
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
  ok: blockers.length === 0,
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
  registry: swiftContract.registry,
  uiTaskContracts: swiftContract.uiTaskContracts,
};

const markdown = renderMarkdown(verdict);
writeFileSync(verdictPath, markdown, 'utf8');
writeFileSync(jsonPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: verdict.ok, dryRun, shouldCaptureSwift, electronShot: verdict.artifacts.electronScreenshot, swiftShot: verdict.artifacts.swiftScreenshot, swiftApp: swiftApp ?? null, swiftBundleId, verdictPath, jsonPath, blockers }, null, 2));

async function captureElectron() {
  if (process.platform === 'darwin' && existsSync(packagedExecutable)) {
    cleanupLingeringPackagedElectron();
    let lastError = 'unknown packaged Electron capture failure';
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      rmSync(electronUserDataDir, { force: true, recursive: true });
      mkdirSync(electronUserDataDir, { recursive: true });
      const seed = seedSwiftVisualBaseline(electronUserDataDir);
      if (seed.ok !== true) {
        lastError = `Swift visual baseline seed attempt ${attempt} failed: ${seed.error ?? seed.reason ?? 'unknown seed failure'}`;
        continue;
      }
      const result = spawnSync(packagedExecutable, ['--use-mock-keychain', `--user-data-dir=${electronUserDataDir}`], {
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          WHISPREE_CAPTURE_SCREENSHOT: electronShot,
          WHISPREE_CAPTURE_DOM_REPORT: electronDomReport,
          WHISPREE_REPO_ROOT: repoRoot,
          WHISPREE_ALLOW_PACKAGED_SCREENSHOT: '1',
          WHISPREE_SMOKE_MODE: `visual-parity-electron-attempt-${attempt}`,
          WHISPREE_USE_MOCK_KEYCHAIN: '1',
          WHISPREE_USER_DATA_DIR: electronUserDataDir,
          ...(seed.groqApiKeyConfigured ? { WHISPREE_GROQ_API_KEY_FOR_TESTS: 'configured-for-visual-parity' } : {}),
        },
        encoding: 'utf8',
        input: '',
        timeout: 60_000,
      });
      if (result.status === 0 && !result.error && existsSync(electronShot)) return;
      lastError = `Packaged Electron screenshot capture attempt ${attempt} failed (${result.status ?? 'no-status'}): ${result.error ? errorMessage(result.error) : result.stderr}`;
      cleanupLingeringPackagedElectron();
    }
    throw new Error(lastError);
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npm', ['start'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        WHISPREE_CAPTURE_SCREENSHOT: electronShot,
        WHISPREE_CAPTURE_DOM_REPORT: electronDomReport,
        WHISPREE_REPO_ROOT: repoRoot,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1500).unref();
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

function cleanupLingeringPackagedElectron() {
  if (process.platform !== 'darwin') return;
  spawnSync('pkill', ['-f', packagedExecutable], { stdio: 'ignore' });
}

function seedSwiftVisualBaseline(userDataDir) {
  const seedScript = resolve(repoRoot, 'scripts/seed-swift-visual-baseline.py');
  if (!existsSync(seedScript) || process.platform !== 'darwin') {
    return { ok: false, skipped: true, reason: 'seed script unavailable for this platform' };
  }
  const result = spawnSync('python3', [seedScript, userDataDir], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: '',
    timeout: 10_000,
  });
  if (result.status !== 0 || result.error) {
    return {
      ok: false,
      error: result.error ? errorMessage(result.error) : `seed exited with status ${result.status}: ${result.stderr}`,
    };
  }
  try {
    return JSON.parse(result.stdout.trim() || '{}');
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

async function captureSwift(appPath, bundleId) {
  let processName = await processNameForBundleId(bundleId).catch(() => null);
  if (processName) {
    await exec('osascript', ['-e', `tell application id "${bundleId}" to activate`]).catch(() => undefined);
  } else {
    await exec('open', [appPath]);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1800));
    processName = await processNameForBundleId(bundleId);
  }
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
  const registryText = readIfExists('docs/UI_PARITY_TASK_REGISTRY.md');
  const sourceInventory = listSwiftReferenceFiles();
  const files = {
    unified: readSwiftSource('Views/UnifiedView.swift'),
    tokens: readSwiftSource('Views/Design/DesignTokens.swift'),
    overlay: readSwiftSource('Views/Transcription/TranscriptionOverlayView.swift'),
    permissions: readSwiftSource('Views/Design/PermissionRow.swift'),
    settings: readSwiftSource('Views/Settings/SettingsView.swift'),
    history: readSwiftSource('Views/Transcription/TranscriptionHistoryView.swift'),
    onboarding: readSwiftSource('Views/Onboarding/OnboardingView.swift'),
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
    tabOrder: tabOrder.every((label) => files.unified.includes(label) || files.settings.includes(label)),
    sidebarWidths: files.unified.includes('220') && files.unified.includes('80') && files.unified.includes('52'),
    glassTokens: ['regularMaterial', 'ultraThinMaterial', 'thickMaterial'].every((token) => files.tokens.includes(token)),
    cardRadius: files.tokens.includes('cardRadius') && files.tokens.includes('18'),
    overlayDimensions: files.overlay.includes('frame(width: 280)') && files.overlay.includes('cornerRadius: 14'),
    permissionRows: files.permissions.includes('Permission') || files.settings.includes('Permissions'),
    settingsAnchors: ['GeneralSettingsView', 'STTSettingsView', 'LLMSettingsView', 'ModelSettingsView', 'DomainWordSetsView'].every((name) => files.unified.includes(name) || files.settings.includes(name)),
    historyAnchors: files.unified.includes('TranscriptionHistoryView') && files.history.length > 0,
    contextOnboarding: files.onboarding.length > 0 && files.unified.includes('MainDashboardView'),
  };
  const registry = {
    path: registryPath,
    exists: existsSync(registryPath),
    trackedPath: 'docs/UI_PARITY_TASK_REGISTRY.md',
    taskIds: expectedUiTaskIds,
    taskIdsCovered: expectedUiTaskIds.every((id) => registryText.includes(`### ${id}`)),
  };
  const uiTaskCoverage = uiTaskContracts.map((task) => {
    const expandedSources = expandSwiftSources(task.swiftSources, sourceInventory);
    const registryCovered = registryText.includes(`### ${task.id}`);
    const sourcesCovered = expandedSources.length > 0 && expandedSources.every((source) => source.exists);
    const sourceText = expandedSources.map((source) => source.text).join('\n');
    const anchorCovered = task.anchors.every((anchor) => registryText.includes(anchor) || sourceText.includes(anchor));
    const blockedReasons = [];
    if (!registryCovered) blockedReasons.push('registry-task-id-missing');
    if (!sourcesCovered) blockedReasons.push('swift-source-reference-missing');
    if (!anchorCovered) blockedReasons.push('swift-anchor-missing');
    return {
      id: task.id,
      title: task.title,
      registryPath: registry.trackedPath,
      swiftSources: task.swiftSources,
      resolvedSwiftSources: expandedSources.map((source) => source.relativePath),
      registryCovered,
      sourcesCovered,
      anchorCovered,
      status: blockedReasons.length === 0 ? 'covered' : 'blocked',
      blockedReasons,
    };
  });
  return {
    sourceRoot: swiftSourceRoot,
    viewsRoot: swiftViewsRoot,
    registry,
    uiTaskContracts: uiTaskCoverage,
    tabOrder,
    iconTones,
    cssTokens,
    permissionRows: ['Microphone', 'Accessibility', 'Screen Recording', 'Browser Context', 'Terminal Context'],
    settingsAnchors: ['Recording shortcut', 'Groq Cloud API', 'WhisperKit', 'MLX Audio', 'OpenAI 인증', '스크린샷 컨텍스트', '도메인 단어 세트', '기록'],
    historyAnchors: ['originalText', 'correctedText', 'deliveredAtIso'],
    contextSurfaces: ['Screenshot Selection', 'Browser Restore', 'Terminal Restore', 'Quick Fix', 'Onboarding'],
    sourceCoverage: coverage,
    sourceCoverageOk: Object.values(coverage).every(Boolean) && registry.taskIdsCovered && uiTaskCoverage.every((task) => task.status === 'covered'),
  };
}

function buildChecklist(contract, artifacts) {
  const taskItems = contract.uiTaskContracts.map((task) => ({
    id: task.id,
    label: `${task.title} — registry ${task.registryPath}; Swift refs: ${task.swiftSources.join(', ')}`,
    status: task.status,
    blockedReasons: task.blockedReasons,
  }));
  return [
    ...taskItems,
    { id: 'registry-tracked-path', label: `Tracked UI parity registry exists at ${contract.registry.trackedPath}`, status: contract.registry.exists && contract.registry.taskIdsCovered ? 'covered' : 'blocked' },
    { id: 'sidebar-tab-order', label: 'Sidebar tab order and labels match Swift', status: contract.sourceCoverage.tabOrder ? 'covered' : 'blocked' },
    { id: 'glass-material-tokens', label: 'Glassy material token contract is present', status: contract.sourceCoverage.glassTokens ? 'covered' : 'blocked' },
    { id: 'card-radius', label: 'Card radius 18px maps to Swift DesignTokens.cardRadius', status: contract.sourceCoverage.cardRadius ? 'covered' : 'blocked' },
    { id: 'overlay-dimensions', label: 'Overlay width 280 and radius 14 are represented', status: contract.sourceCoverage.overlayDimensions ? 'covered' : 'blocked' },
    { id: 'permission-row-coverage', label: 'Permission rows cover microphone/accessibility/screen/browser/terminal', status: contract.sourceCoverage.permissionRows ? 'covered' : 'blocked' },
    { id: 'settings-history-anchors', label: 'Settings and history Swift anchors are represented', status: contract.sourceCoverage.settingsAnchors && contract.sourceCoverage.historyAnchors ? 'covered' : 'blocked' },
    { id: 'electron-current-screenshot', label: 'Current Electron screenshot captured', status: artifacts.electronExists && !dryRun ? 'covered' : 'blocked' },
    { id: 'swift-current-screenshot', label: 'Current Swift screenshot captured explicitly', status: artifacts.shouldCaptureSwift && artifacts.swiftShotExists && !dryRun ? 'covered' : 'blocked' },
  ];
}

function renderMarkdown(value) {
  const taskContractLines = value.uiTaskContracts.map((task) => {
    const blockers = task.blockedReasons.length > 0 ? ` Blockers: ${task.blockedReasons.join(', ')}.` : '';
    return `- [${task.status === 'covered' ? 'x' : ' '}] ${task.id} ${task.title}: ${task.swiftSources.join(', ')}.${blockers}`;
  });
  return `# Whispree Side-by-Side Visual Parity Verdict

Generated: ${new Date().toISOString()}

## Claim

- ${value.claim}
- Pixel-perfect claim allowed: ${value.pixelPerfectClaimAllowed ? 'yes' : 'no'}
- Automated pixel diff: ${value.automatedPixelDiff.implemented ? 'implemented' : 'not implemented'} (${value.automatedPixelDiff.status})

## Sources

- Tracked registry: ${value.registry.trackedPath}
- Swift reference root: ${value.swiftContract.sourceRoot}
- Swift Views root: ${value.swiftContract.viewsRoot}
- UI task IDs covered by contract: ${value.registry.taskIdsCovered ? 'yes' : 'no'}

## Artifacts

- Electron screenshot: ${value.artifacts.electronScreenshot ?? 'missing'}
- Swift app explicit path: ${value.artifacts.swiftApp ?? 'missing'}
- Swift bundle id: ${value.artifacts.swiftBundleId ?? 'missing'}
- Expected Swift bundle id: ${value.artifacts.expectedSwiftBundleId}
- Swift capture opt-in: ${value.shouldCaptureSwift ? 'enabled' : 'disabled'}
- Swift screenshot: ${value.artifacts.swiftScreenshot ?? 'missing'}
- JSON verdict: ${value.artifacts.json}

## Verdict

${value.blockers.length === 0 ? 'Ready for manual side-by-side review. No automated pixel-perfect claim is made by this script.' : 'Blocked/not-tested for pixel parity. Do not claim pixel-perfect parity.'}

## Blockers

${value.blockers.length > 0 ? value.blockers.map((item) => `- ${item}`).join('\n') : '- none'}

## UI task source contract

${taskContractLines.join('\n')}

## Required checklist

${value.checklist.map((item) => `- [${item.status === 'covered' ? 'x' : ' '}] ${item.id}: ${item.label}`).join('\n')}
`;
}

function listSwiftReferenceFiles() {
  return uiTaskContracts
    .flatMap((task) => task.swiftSources)
    .filter((source) => source.startsWith('Views/') && !source.includes('*'))
    .filter((source, index, sources) => sources.indexOf(source) === index);
}

function expandSwiftSources(sources, inventory) {
  return sources.flatMap((source) => {
    if (source === 'Views/**/*.swift') {
      return inventory.map((relativePath) => swiftSourceDescriptor(relativePath));
    }
    if (source.startsWith('Views/')) {
      return [swiftSourceDescriptor(source)];
    }
    if (source === 'docs/UI_PARITY_TASK_REGISTRY.md') {
      return [{ relativePath: source, absolutePath: registryPath, exists: existsSync(registryPath), text: readIfExists(source) }];
    }
    return [{ relativePath: source, absolutePath: resolve(repoRoot, source), exists: true, text: '' }];
  });
}

function swiftSourceDescriptor(relativePath) {
  const absolutePath = resolve(swiftSourceRoot, 'Whispree', relativePath);
  return { relativePath, absolutePath, exists: existsSync(absolutePath), text: existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '' };
}

function readSwiftSource(relativePath) {
  return swiftSourceDescriptor(relativePath).text;
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
