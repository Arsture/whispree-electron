# Electron Release Runbook

This repo keeps the old Swift/Sparkle workflows manual-gated and uses a separate Electron release path.

## Workflows

- `.github/workflows/electron-ci.yml` runs PR/push verification on macOS and Windows.
- `.github/workflows/electron-release.yml` is manual-gated with `confirm_electron_release` and runs `npm run verify`, strict `npm run signing:preflight:release`, `npm run probe:real`, and `npm run make` on macOS and Windows.
- `.github/workflows/release.yml` remains the legacy Swift release path and is not triggered by push/tag events.

## Required secrets / environment

Do not store secret values in the repo. Configure them in GitHub Secrets or a protected Environment.

### macOS signing / notarization

- `MACOS_SIGN_IDENTITY` enables Electron Forge `osxSign`.
- Use either Apple ID notarization:
  - `APPLE_ID`
  - `APPLE_APP_SPECIFIC_PASSWORD`
  - `APPLE_TEAM_ID`
- Or App Store Connect API key notarization:
  - `APPLE_API_KEY`
  - `APPLE_API_KEY_ID`
  - `APPLE_API_ISSUER`

### Windows signing

- Classic PFX/Squirrel signing is wired through:
  - `WINDOWS_CERTIFICATE_FILE`
  - `WINDOWS_CERTIFICATE_PASSWORD`
- Azure Trusted Signing variables are detected by preflight but are not wired into Forge yet:
  - `AZURE_TENANT_ID`
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET`
  - `AZURE_TRUSTED_SIGNING_ACCOUNT`
  - `AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE`

## Distribution status

- macOS: ZIP maker is configured; signing/notarization are env-gated. The native hotkey helper is built before package/make and copied as an extra resource when present.
- Windows: Squirrel maker is configured; classic PFX signing is env-gated. Windows runtime and signing remain not-tested from a macOS host until the Windows workflow run proves them.
- DMG and Azure Trusted Signing are explicit future work, not silently implied by CI.

## Local verification

```bash
npm run check:workflows
npm run test:signing-preflight
npm run signing:preflight
npm run signing:preflight:release # intentionally fails without current-host release credentials
npm run package
npm run make
```
