#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const packagedApp = resolve(repoRoot, 'out/Whispree-darwin-arm64/Whispree.app');
const executable = resolve(packagedApp, 'Contents/MacOS/Whispree');
const smokeRoot = resolve(repoRoot, '.omx/artifacts/packaged-app-smoke');
const screenshot = resolve(smokeRoot, 'packaged-app.png');
const reportPath = resolve(smokeRoot, 'packaged-app-smoke-report.json');
const domReport = resolve(smokeRoot, 'packaged-app-dom-report.json');
const userDataDir = resolve(smokeRoot, 'electron-user-data');
const screenshotRequest = relative(repoRoot, screenshot);
const domReportRequest = relative(repoRoot, domReport);
const timeoutMs = 45_000;

mkdirSync(smokeRoot, { recursive: true });

if (process.platform !== 'darwin') {
  finish({
    ok: true,
    skipped: true,
    reason: 'packaged .app smoke is macOS-only in this workspace.',
    platform: process.platform,
  }, 0);
}

if (!existsSync(executable)) {
  finish({
    ok: false,
    error: 'Packaged app executable missing. Run npm run package first.',
    executable,
    packageCommand: 'npm run package',
  }, 1);
}

rmSync(screenshot, { force: true });
rmSync(reportPath, { force: true });
rmSync(domReport, { force: true });
rmSync(userDataDir, { force: true, recursive: true });
mkdirSync(userDataDir, { recursive: true });

const startedAt = new Date();
const result = spawnSync(executable, ['--use-mock-keychain', `--user-data-dir=${userDataDir}`], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    WHISPREE_CAPTURE_SCREENSHOT: screenshotRequest,
    WHISPREE_REPO_ROOT: repoRoot,
    WHISPREE_ALLOW_PACKAGED_SCREENSHOT: '1',
    WHISPREE_SMOKE_MODE: 'packaged-app-ui',
    WHISPREE_USE_MOCK_KEYCHAIN: '1',
    WHISPREE_USER_DATA_DIR: userDataDir,
    WHISPREE_CAPTURE_DOM_REPORT: domReportRequest,
  },
  encoding: 'utf8',
  input: '',
  timeout: timeoutMs,
});
const finishedAt = new Date();
const screenshotExists = existsSync(screenshot);
const domReportExists = existsSync(domReport);
const screenshotBytes = screenshotExists ? statSync(screenshot).size : 0;
const domReadiness = readDomReadiness(domReport);
const timedOut = result.error?.message.includes('ETIMEDOUT') ?? false;
const ok = result.status === 0 && !result.error && screenshotExists && screenshotBytes > 0 && domReadiness.rootPresent && domReadiness.bodyHasWhispree;

finish({
  ok,
  productionAppStarted: ok,
  packagedApp,
  executable,
  screenshot,
  screenshotRequest,
  screenshotBytes,
  report: reportPath,
  domReport,
  domReportExists,
  domReadiness,
  userDataDir,
  timeoutMs,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  exitStatus: result.status,
  signal: result.signal,
  timedOut,
  stdout: trimForReport(result.stdout),
  stderr: trimForReport(result.stderr),
  error: ok ? undefined : failureReason(result, screenshotExists, screenshotBytes, domReadiness),
}, ok ? 0 : 1);

function finish(report, exitCode) {
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const output = JSON.stringify(report, null, 2);
  if (exitCode === 0) console.log(output);
  else console.error(output);
  process.exit(exitCode);
}

function failureReason(result, screenshotExists, screenshotBytes, domReadiness) {
  if (result.error) return errorMessage(result.error);
  if (result.status !== 0) return `Packaged app exited with status ${result.status}.`;
  if (!screenshotExists) return 'Packaged app exited without writing smoke screenshot.';
  if (screenshotBytes <= 0) return 'Packaged app wrote an empty smoke screenshot.';
  if (!domReadiness.rootPresent) return 'Packaged app did not render the Whispree shell root before screenshot.';
  if (!domReadiness.bodyHasWhispree) return 'Packaged app screenshot was captured before visible Whispree UI text rendered.';
  return 'Unknown packaged smoke failure.';
}

function readDomReadiness(filePath) {
  if (!existsSync(filePath)) {
    return { rootPresent: false, bodyHasWhispree: false, error: 'dom report missing' };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      rootPresent: parsed.rootPresent === true,
      bodyHasWhispree: typeof parsed.bodyText === 'string' && parsed.bodyText.includes('Whispree'),
      bodyTextPreview: typeof parsed.bodyText === 'string' ? parsed.bodyText.slice(0, 240) : '',
    };
  } catch (error) {
    return { rootPresent: false, bodyHasWhispree: false, error: errorMessage(error) };
  }
}

function trimForReport(value) {
  if (!value) return '';
  return value.length > 4000 ? `${value.slice(0, 4000)}\n...[truncated]` : value;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
