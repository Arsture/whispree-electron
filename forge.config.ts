import type { ForgeConfig } from '@electron-forge/shared-types';
import { existsSync } from 'node:fs';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const macosSignIdentity = process.env.MACOS_SIGN_IDENTITY;
const appleId = process.env.APPLE_ID;
const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleApiKey = process.env.APPLE_API_KEY;
const appleApiKeyId = process.env.APPLE_API_KEY_ID;
const appleApiIssuer = process.env.APPLE_API_ISSUER;
const hasAppleIdNotary = Boolean(appleId && appleIdPassword && appleTeamId);
const hasAppleApiKeyNotary = Boolean(appleApiKey && appleApiKeyId && appleApiIssuer);
const macosHotkeyHelper = 'build/macos-hotkey-helper/whispree-hotkey-helper';
const windowsCertificateFile = process.env.WINDOWS_CERTIFICATE_FILE;
const windowsCertificatePassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;
const hasWindowsPfxSigning = Boolean(windowsCertificateFile && windowsCertificatePassword);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'Whispree',
    name: 'Whispree',
    extraResource: existsSync(macosHotkeyHelper) ? [macosHotkeyHelper] : [],
    ...(macosSignIdentity
      ? {
          osxSign: {
            identity: macosSignIdentity,
            optionsForFile: () => ({
              entitlements: 'build/entitlements.mac.plist',
              hardenedRuntime: true,
            }),
          },
        }
      : {}),
    ...((hasAppleIdNotary || hasAppleApiKeyNotary)
      ? {
          osxNotarize: hasAppleApiKeyNotary
            ? {
                appleApiKey: appleApiKey!,
                appleApiKeyId: appleApiKeyId!,
                appleApiIssuer: appleApiIssuer!,
              }
            : {
                appleId: appleId!,
                appleIdPassword: appleIdPassword!,
                teamId: appleTeamId!,
              },
        }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerSquirrel(hasWindowsPfxSigning ? { certificateFile: windowsCertificateFile!, certificatePassword: windowsCertificatePassword! } : {}, ['win32']),
    new MakerDeb({}, ['linux']),
    new MakerRpm({}, ['linux']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
      concurrent: false,
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
