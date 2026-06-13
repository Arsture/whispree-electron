#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const platform = process.platform;
const macEnv = presence(['MACOS_SIGN_IDENTITY', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']);
const windowsEnv = presence(['WINDOWS_CERTIFICATE_FILE', 'WINDOWS_CERTIFICATE_PASSWORD', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TRUSTED_SIGNING_ACCOUNT', 'AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE']);
const macIdentities = platform === 'darwin' ? codesignIdentityCount() : { status: 'not-tested', count: 0, detail: 'not macOS' };
const result = {
  ok: true,
  platform,
  macos: {
    identities: macIdentities,
    env: macEnv,
    notarizationReady: (macEnv.APPLE_ID && macEnv.APPLE_APP_SPECIFIC_PASSWORD && macEnv.APPLE_TEAM_ID) || (macEnv.APPLE_API_KEY && macEnv.APPLE_API_KEY_ID && macEnv.APPLE_API_ISSUER),
  },
  windows: {
    env: windowsEnv,
    signingReady: (windowsEnv.WINDOWS_CERTIFICATE_FILE && windowsEnv.WINDOWS_CERTIFICATE_PASSWORD) || (windowsEnv.AZURE_TENANT_ID && windowsEnv.AZURE_CLIENT_ID && windowsEnv.AZURE_CLIENT_SECRET && windowsEnv.AZURE_TRUSTED_SIGNING_ACCOUNT && windowsEnv.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE),
    hostReady: platform === 'win32',
  },
};
console.log(JSON.stringify(result, null, 2));

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
