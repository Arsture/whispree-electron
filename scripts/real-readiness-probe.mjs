#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, '.omx/artifacts/real-os-ai-permissions-parity');
const jsonPath = resolve(artifactRoot, 'readiness-probe.json');
const markdownPath = resolve(artifactRoot, 'readiness-probe.md');

const env = process.env;
const platform = process.platform;
const now = new Date().toISOString();

function command(commandName, args = [], options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(commandName, args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error?.stdout?.toString?.().trim?.() ?? '',
      stderr: error?.stderr?.toString?.().trim?.() ?? errorMessage(error),
    };
  }
}

function commandExists(commandName) {
  const probe = platform === 'win32' ? command('where.exe', [commandName]) : command('/usr/bin/env', ['bash', '-lc', `command -v ${shellQuote(commandName)}`]);
  return { command: commandName, available: probe.ok, path: probe.stdout.split('\n')[0] || null };
}

function envPresence(keys) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(env[key]) && String(env[key]).trim().length > 0]));
}

function gitStatus(path) {
  const result = command('git', ['-C', path, 'status', '--short']);
  return {
    path,
    available: result.ok,
    clean: result.ok ? result.stdout.length === 0 : false,
    detail: result.ok ? (result.stdout || 'clean') : result.stderr,
  };
}

function macSigningReadiness() {
  if (platform !== 'darwin') return { status: 'not-tested', reason: 'macOS signing probe only runs on macOS.' };
  const identities = command('security', ['find-identity', '-v', '-p', 'codesigning']);
  const xcode = command('xcode-select', ['-p']);
  const identityLines = identities.stdout.split('\n').filter((line) => /\) [A-F0-9]+/.test(line));
  return {
    status: identityLines.length > 0 ? 'available' : 'blocked',
    identityCount: identityLines.length,
    xcodePath: xcode.ok ? xcode.stdout : null,
    detail: identities.ok ? identities.stdout : identities.stderr,
  };
}

function macPermissionProbe() {
  if (platform !== 'darwin') return { status: 'not-tested', reason: 'macOS TCC probe only runs on macOS.' };
  return {
    status: 'manual-required',
    reason: 'Electron systemPreferences can query/request media permissions only inside the app process; TCC prompts require user action.',
    systemSettingsDeepLinks: {
      microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      screenRecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
      automation: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
    },
  };
}

function windowsSigningReadiness() {
  const classic = envPresence(['WINDOWS_CERTIFICATE_FILE', 'WINDOWS_CERTIFICATE_PASSWORD']);
  const azure = envPresence(['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TRUSTED_SIGNING_ACCOUNT', 'AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE']);
  const completeClassic = Object.values(classic).every(Boolean);
  const completeAzure = Object.values(azure).every(Boolean);
  return {
    status: completeClassic || completeAzure ? 'configured' : 'blocked',
    classicPfxEnv: classic,
    azureTrustedSigningEnv: azure,
    note: platform === 'win32' ? 'Windows host available.' : 'Windows host not available in this probe; signing remains not-tested locally.',
  };
}

const localCommands = [
  'uv',
  'python3',
  'python.exe',
  'whisper-cli',
  'whisper-cli.exe',
  'llama-cli',
  'llama-cli.exe',
  'llama-server.exe',
  'onnxruntime_perf_test.exe',
].map(commandExists);

const probe = {
  generatedAt: now,
  repoRoot,
  host: {
    platform,
    arch: process.arch,
    node: process.version,
  },
  git: {
    migrationRepo: gitStatus(repoRoot),
    originalSwiftRepo: gitStatus(resolve(repoRoot, '..', 'whispree')),
  },
  permissions: {
    macos: macPermissionProbe(),
  },
  signing: {
    macos: macSigningReadiness(),
    notarizationEnv: envPresence(['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']),
    windows: windowsSigningReadiness(),
  },
  localAi: {
    windowsEnginePolicy: 'Windows candidates must use whisper.cpp, ONNX Runtime DirectML, llama.cpp, or another non-MLX backend until Windows execution proves readiness.',
    commandAvailability: localCommands,
  },
  blockers: [],
};

if (!probe.git.originalSwiftRepo.clean) probe.blockers.push('original-swift-repo-not-clean-or-unavailable');
if (probe.signing.macos.status === 'blocked') probe.blockers.push('macos-signing-identity-missing');
if (probe.signing.windows.status === 'blocked') probe.blockers.push('windows-signing-credentials-missing');
if (platform !== 'win32') probe.blockers.push('windows-runtime-not-executed-on-this-host');

mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(probe, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown(probe), 'utf8');
console.log(JSON.stringify({ ok: true, jsonPath, markdownPath, blockers: probe.blockers }, null, 2));

function renderMarkdown(value) {
  return `# Real Runtime Readiness Probe\n\nGenerated: ${value.generatedAt}\n\n## Host\n\n- Platform: ${value.host.platform}\n- Arch: ${value.host.arch}\n- Node: ${value.host.node}\n\n## Git\n\n- Migration repo: ${value.git.migrationRepo.detail}\n- Original Swift repo: ${value.git.originalSwiftRepo.detail}\n\n## Signing\n\n- macOS signing: ${value.signing.macos.status}\n- Windows signing: ${value.signing.windows.status}\n\n## Local AI command availability\n\n${value.localAi.commandAvailability.map((item) => `- ${item.command}: ${item.available ? item.path : 'missing'}`).join('\n')}\n\n## Blockers / not-tested\n\n${value.blockers.length > 0 ? value.blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
