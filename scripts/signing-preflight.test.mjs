#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const jsonPath = resolve(root, '.omx/artifacts/signing/signing-preflight.json');
const output = execFileSync('node', ['scripts/signing-preflight.mjs'], {
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
  if (parsed.windows.azureTrustedSigning.envComplete !== true) throw new Error('Azure env should be detected as complete in test env');
  if (parsed.windows.azureTrustedSigning.wired !== false) throw new Error('Azure Trusted Signing must not be reported wired without Forge hook support');
  if (parsed.windows.azureTrustedSigning.ready !== false) throw new Error('Azure Trusted Signing must not be reported ready without wiring');
  if (parsed.windows.signingReady !== false) throw new Error('Windows signingReady must stay false without classic PFX wiring');
  if (!parsed.blockers.includes('windows-azure-trusted-signing-not-wired')) throw new Error('Missing Azure not-wired blocker');
}
console.log('Signing preflight Azure-not-wired guard passed.');
