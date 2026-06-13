#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const jsonPath = resolve(root, '.omx/artifacts/signing/signing-preflight.json');
const output = execFileSync('node', ['scripts/signing-preflight.mjs', '--report-only'], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    AZURE_TENANT_ID: 'tenant',
    AZURE_CLIENT_ID: 'client',
    AZURE_CLIENT_SECRET: 'secret',
    AZURE_TRUSTED_SIGNING_ACCOUNT: 'account',
    AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE: 'profile',
    WINDOWS_CERTIFICATE_FILE: '',
    WINDOWS_CERTIFICATE_PASSWORD: '',
  },
});
const parsedOutput = JSON.parse(output);
const parsedArtifact = JSON.parse(readFileSync(jsonPath, 'utf8'));
for (const parsed of [parsedOutput, parsedArtifact]) {
  if (parsed.ok !== true) throw new Error('Report-only signing preflight should not fail local verification');
  if (parsed.mode !== 'report-only') throw new Error('Expected report-only mode for local signing preflight test');
  if (parsed.windows.azureTrustedSigning.envComplete !== true) throw new Error('Azure env should be detected as complete in test env');
  if (parsed.windows.azureTrustedSigning.wired !== false) throw new Error('Azure Trusted Signing must not be reported wired without Forge hook support');
  if (parsed.windows.azureTrustedSigning.ready !== false) throw new Error('Azure Trusted Signing must not be reported ready without wiring');
  if (parsed.windows.signingReady !== false) throw new Error('Windows signingReady must stay false without classic PFX wiring');
  if (!parsed.blockers.includes('windows-azure-trusted-signing-not-wired')) throw new Error('Missing Azure not-wired blocker');
}

const strict = spawnSync('node', ['scripts/signing-preflight.mjs', '--strict-release'], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    MACOS_SIGN_IDENTITY: '',
    APPLE_ID: '',
    APPLE_APP_SPECIFIC_PASSWORD: '',
    APPLE_TEAM_ID: '',
    APPLE_API_KEY: '',
    APPLE_API_KEY_ID: '',
    APPLE_API_ISSUER: '',
    WINDOWS_CERTIFICATE_FILE: '',
    WINDOWS_CERTIFICATE_PASSWORD: '',
    AZURE_TENANT_ID: '',
    AZURE_CLIENT_ID: '',
    AZURE_CLIENT_SECRET: '',
    AZURE_TRUSTED_SIGNING_ACCOUNT: '',
    AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE: '',
  },
});
if (strict.status === 0) throw new Error('Strict release signing preflight must fail without current-host release credentials');
if (!strict.stdout) throw new Error(`Strict release signing preflight did not emit JSON: ${strict.stderr}`);
const strictParsed = JSON.parse(strict.stdout);
if (strictParsed.ok !== false) throw new Error('Strict release signing preflight should report ok=false when release blockers exist');
if (strictParsed.mode !== 'strict-release') throw new Error('Expected strict-release mode');
if (!Array.isArray(strictParsed.releaseGate?.blockers) || strictParsed.releaseGate.blockers.length === 0) {
  throw new Error('Strict release signing preflight should report current-host release blockers');
}

console.log('Signing preflight report-only and strict-release guards passed.');
