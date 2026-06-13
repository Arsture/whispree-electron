#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const artifactRoot = resolve(process.cwd(), '.omx/artifacts/signing');
const jsonPath = resolve(artifactRoot, 'signing-preflight.json');
const markdownPath = resolve(artifactRoot, 'signing-preflight.md');
const args = new Set(process.argv.slice(2));
const mode = args.has('--strict-release') ? 'strict-release' : 'report-only';
const platform = process.platform;
const macEnv = presence(['MACOS_SIGN_IDENTITY', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']);
const windowsEnv = presence(['WINDOWS_CERTIFICATE_FILE', 'WINDOWS_CERTIFICATE_PASSWORD', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TRUSTED_SIGNING_ACCOUNT', 'AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE']);
const macIdentities = platform === 'darwin' ? codesignIdentityCount() : { status: 'not-tested', count: 0, detail: 'not macOS' };
const notarizationReady = (macEnv.APPLE_ID && macEnv.APPLE_APP_SPECIFIC_PASSWORD && macEnv.APPLE_TEAM_ID) || (macEnv.APPLE_API_KEY && macEnv.APPLE_API_KEY_ID && macEnv.APPLE_API_ISSUER);
const windowsClassicReady = windowsEnv.WINDOWS_CERTIFICATE_FILE && windowsEnv.WINDOWS_CERTIFICATE_PASSWORD;
const windowsAzureEnvComplete = windowsEnv.AZURE_TENANT_ID && windowsEnv.AZURE_CLIENT_ID && windowsEnv.AZURE_CLIENT_SECRET && windowsEnv.AZURE_TRUSTED_SIGNING_ACCOUNT && windowsEnv.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE;
const blockers = [];
if (platform === 'darwin' && !macEnv.MACOS_SIGN_IDENTITY) blockers.push('macos-signing-identity-env-missing');
if (platform === 'darwin' && macIdentities.status === 'blocked') blockers.push('macos-signing-identity-missing');
if (!notarizationReady) blockers.push('macos-notarization-credentials-missing');
if (!windowsClassicReady) blockers.push('windows-signing-credentials-missing');
if (windowsAzureEnvComplete) blockers.push('windows-azure-trusted-signing-not-wired');
if (platform !== 'win32') blockers.push('windows-signing-not-executed-on-this-host');
const releaseBlockers = releaseBlockersForPlatform();

const result = {
  ok: mode === 'strict-release' ? releaseBlockers.length === 0 : true,
  generatedAt: new Date().toISOString(),
  mode,
  platform,
  macos: {
    identities: macIdentities,
    env: macEnv,
    forgeConfig: 'packagerConfig.osxSign/osxNotarize are enabled only when signing/notarization env is present.',
    notarizationReady,
  },
  windows: {
    env: windowsEnv,
    forgeConfig: 'MakerSquirrel receives certificateFile/certificatePassword when WINDOWS_CERTIFICATE_FILE and WINDOWS_CERTIFICATE_PASSWORD are present. Azure Trusted Signing env is detected but not wired into Forge yet.',
    classicPfxReady: windowsClassicReady,
    azureTrustedSigning: {
      envComplete: windowsAzureEnvComplete,
      wired: false,
      ready: false,
      reason: 'Azure Trusted Signing requires an explicit signing hook/tool integration and is not wired in this Electron Forge config.',
    },
    signingReady: windowsClassicReady,
    hostReady: platform === 'win32',
  },
  blockers,
  releaseGate: {
    strict: mode === 'strict-release',
    ready: releaseBlockers.length === 0,
    blockers: releaseBlockers,
  },
};

mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown(result), 'utf8');
console.log(JSON.stringify({ ...result, jsonPath, markdownPath }, null, 2));
if (!result.ok) process.exit(1);

function presence(keys) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(process.env[key]) && String(process.env[key]).trim().length > 0]));
}

function codesignIdentityCount() {
  try {
    const output = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' });
    const count = output.split('\n').filter((line) => /\) [A-F0-9]+/.test(line)).length;
    return { status: count > 0 ? 'available' : 'blocked', count, detail: output.trim() };
  } catch (error) {
    return { status: 'blocked', count: 0, detail: error instanceof Error ? error.message : String(error) };
  }
}

function releaseBlockersForPlatform() {
  if (platform === 'darwin') {
    const macBlockers = [];
    if (!macEnv.MACOS_SIGN_IDENTITY) macBlockers.push('macos-signing-identity-env-missing');
    if (macIdentities.status === 'blocked') macBlockers.push('macos-signing-identity-missing');
    if (!notarizationReady) macBlockers.push('macos-notarization-credentials-missing');
    return macBlockers;
  }
  if (platform === 'win32') {
    if (windowsClassicReady) return [];
    const winBlockers = ['windows-signing-credentials-missing'];
    if (windowsAzureEnvComplete) winBlockers.push('windows-azure-trusted-signing-not-wired');
    return winBlockers;
  }
  return ['release-host-unsupported'];
}

function renderMarkdown(value) {
  return `# Signing and Notarization Preflight\n\nGenerated: ${value.generatedAt}\nMode: ${value.mode}\n\n## Release Gate\n\n- strict: ${value.releaseGate.strict ? 'yes' : 'no'}\n- ready: ${value.releaseGate.ready ? 'yes' : 'no'}\n- current-host release blockers: ${value.releaseGate.blockers.length > 0 ? value.releaseGate.blockers.join(', ') : 'none'}\n\n## macOS\n\n- codesign identities: ${value.macos.identities.status} (${value.macos.identities.count})\n- signing identity env: ${value.macos.env.MACOS_SIGN_IDENTITY ? 'yes' : 'no'}\n- notarization ready: ${value.macos.notarizationReady ? 'yes' : 'no'}\n- Forge: ${value.macos.forgeConfig}\n\n## Windows\n\n- classic PFX ready: ${value.windows.classicPfxReady ? 'yes' : 'no'}\n- Azure Trusted Signing env complete: ${value.windows.azureTrustedSigning.envComplete ? 'yes' : 'no'}\n- Azure Trusted Signing wired: ${value.windows.azureTrustedSigning.wired ? 'yes' : 'no'}\n- Azure Trusted Signing ready: ${value.windows.azureTrustedSigning.ready ? 'yes' : 'no'}\n- host ready: ${value.windows.hostReady ? 'yes' : 'no'}\n- Forge: ${value.windows.forgeConfig}\n\n## Blockers\n\n${value.blockers.length > 0 ? value.blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n`;
}
