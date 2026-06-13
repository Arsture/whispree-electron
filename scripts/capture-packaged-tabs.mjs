#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const packagedApp = resolve(repoRoot, 'out/Whispree-darwin-arm64/Whispree.app');
const executable = resolve(packagedApp, 'Contents/MacOS/Whispree');
const artifactRoot = resolve(repoRoot, '.omx/artifacts/visual-parity/tabs');
const timeoutMs = 45_000;
const tabs = ['general', 'stt', 'llm', 'models', 'word-sets', 'history'];

mkdirSync(artifactRoot, { recursive: true });

if (process.platform !== 'darwin') {
  finish({ ok: true, skipped: true, reason: 'packaged tab capture is macOS-only in this workspace.' }, 0);
}

if (!existsSync(executable)) {
  finish({ ok: false, error: 'Packaged app executable missing. Run npm run package first.', executable }, 1);
}

const reports = tabs.map(captureTab);
const ok = reports.every((report) => report.ok);
finish({
  ok,
  packagedApp,
  executable,
  artifactRoot,
  tabs: reports,
}, ok ? 0 : 1);

function captureTab(tab) {
  const tabRoot = resolve(artifactRoot, tab);
  const screenshot = resolve(tabRoot, `${tab}.png`);
  const domReport = resolve(tabRoot, `${tab}-dom.json`);
  const userDataDir = resolve(tabRoot, 'electron-user-data');
  mkdirSync(tabRoot, { recursive: true });
  rmSync(screenshot, { force: true });
  rmSync(domReport, { force: true });
  rmSync(userDataDir, { force: true, recursive: true });
  mkdirSync(userDataDir, { recursive: true });
  const seed = seedSwiftVisualBaseline(userDataDir);

  const startedAt = new Date();
  const result = spawnSync(executable, ['--use-mock-keychain', `--user-data-dir=${userDataDir}`], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WHISPREE_CAPTURE_SCREENSHOT: relative(repoRoot, screenshot),
      WHISPREE_CAPTURE_DOM_REPORT: relative(repoRoot, domReport),
      WHISPREE_REPO_ROOT: repoRoot,
      WHISPREE_ALLOW_PACKAGED_SCREENSHOT: '1',
      WHISPREE_SMOKE_MODE: `packaged-tab-${tab}`,
      WHISPREE_USE_MOCK_KEYCHAIN: '1',
      WHISPREE_USER_DATA_DIR: userDataDir,
      WHISPREE_INITIAL_SECTION: tab,
      ...(seed.groqApiKeyConfigured ? { WHISPREE_GROQ_API_KEY_FOR_TESTS: 'configured-for-visual-parity' } : {}),
    },
    encoding: 'utf8',
    input: '',
    timeout: timeoutMs,
  });
  const finishedAt = new Date();
  const screenshotExists = existsSync(screenshot);
  const screenshotBytes = screenshotExists ? statSync(screenshot).size : 0;
  const dom = readDom(domReport);
  const ok = result.status === 0 && !result.error && screenshotBytes > 0 && dom.rootPresent && dom.activePanel === tab;
  return {
    ok,
    tab,
    screenshot,
    screenshotBytes,
    domReport,
    dom,
    userDataDir,
    swiftBaselineSeed: seed,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    exitStatus: result.status,
    signal: result.signal,
    stderr: trimForReport(result.stderr),
    stdout: trimForReport(result.stdout),
    error: ok ? undefined : failureReason(result, screenshotBytes, dom, tab),
  };
}

function seedSwiftVisualBaseline(userDataDir) {
  const seedScript = resolve(repoRoot, 'scripts/seed-swift-visual-baseline.py');
  if (!existsSync(seedScript) || process.platform !== 'darwin') return { ok: false, skipped: true, reason: 'seed script unavailable' };
  const result = spawnSync('python3', [seedScript, userDataDir], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: '',
    timeout: 10_000,
  });
  if (result.status !== 0 || result.error) {
    return {
      ok: false,
      error: result.error ? errorMessage(result.error) : `seed exited with status ${result.status}`,
      stderr: trimForReport(result.stderr),
      stdout: trimForReport(result.stdout),
    };
  }
  try {
    return JSON.parse(result.stdout.trim() || '{}');
  } catch (error) {
    return { ok: false, error: errorMessage(error), stdout: trimForReport(result.stdout), stderr: trimForReport(result.stderr) };
  }
}

function readDom(filePath) {
  if (!existsSync(filePath)) return { rootPresent: false, activePanel: null, bodyTextPreview: '', error: 'dom report missing' };
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const activePanel = typeof parsed.activePanel === 'string' ? parsed.activePanel : extractActivePanel(parsed.bodyText ?? '');
    return {
      rootPresent: parsed.rootPresent === true,
      activePanel,
      settingsLoaded: parsed.settingsLoaded === true,
      snapshotLoaded: parsed.snapshotLoaded === true,
      bodyTextPreview: typeof parsed.bodyText === 'string' ? parsed.bodyText.slice(0, 240) : '',
    };
  } catch (error) {
    return { rootPresent: false, activePanel: null, bodyTextPreview: '', error: errorMessage(error) };
  }
}

function extractActivePanel(bodyText) {
  // The DOM report includes all mounted hidden panels as text, so use the location query marker when possible.
  // main.ts sets the requested tab in the URL, and App mounts that panel as active before capture.
  // A text-only fallback keeps this script resilient to older DOM reports.
  const known = {
    general: ['Recording shortcut', '사용자 정의 경로'],
    stt: ['음성 인식 엔진', 'Groq Cloud API'],
    llm: ['교정 엔진', 'OpenAI 인증'],
    models: ['STT 모델', 'WhisperKit Large V3 Turbo'],
    'word-sets': ['도메인 단어 세트', '새 단어 추가'],
    history: ['No Transcriptions Yet', '기록'],
  };
  for (const [tab, markers] of Object.entries(known)) {
    if (markers.every((marker) => bodyText.includes(marker))) return tab;
  }
  return null;
}

function failureReason(result, screenshotBytes, dom, expectedTab) {
  if (result.error) return errorMessage(result.error);
  if (result.status !== 0) return `Packaged app exited with status ${result.status}.`;
  if (screenshotBytes <= 0) return 'Packaged tab capture did not write a non-empty screenshot.';
  if (!dom.rootPresent) return 'Packaged app did not render the Whispree shell root.';
  if (dom.activePanel !== expectedTab) return `Expected active panel ${expectedTab}, detected ${dom.activePanel ?? 'unknown'}.`;
  return 'Unknown packaged tab capture failure.';
}

function finish(report, exitCode) {
  const reportPath = resolve(artifactRoot, 'tabs-capture-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const output = JSON.stringify({ ...report, report: reportPath }, null, 2);
  if (exitCode === 0) console.log(output);
  else console.error(output);
  process.exit(exitCode);
}

function trimForReport(value) {
  if (!value) return '';
  return value.length > 4000 ? `${value.slice(0, 4000)}\n...[truncated]` : value;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
