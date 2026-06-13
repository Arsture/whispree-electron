import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { electronUiParityArtifactRoot, resolveScreenshotCapturePath } from './screenshot-capture';

const repoRoot = '/repo/whispree-electron';

describe('screenshot capture gating', () => {
  it('requires explicit request, unpackaged app, and non-production env', () => {
    expect(resolveScreenshotCapturePath(undefined, { repoRoot, isPackaged: false, nodeEnv: 'test' })).toEqual({
      enabled: false,
      reason: 'not-requested',
    });
    expect(
      resolveScreenshotCapturePath('.omx/artifacts/electron-ui-parity/a.png', { repoRoot, isPackaged: true, nodeEnv: 'test' }),
    ).toEqual({ enabled: false, reason: 'packaged-app' });
    expect(
      resolveScreenshotCapturePath('.omx/artifacts/electron-ui-parity/a.png', { repoRoot, isPackaged: false, nodeEnv: 'production' }),
    ).toEqual({ enabled: false, reason: 'production-env' });
  });

  it('constrains screenshots to the UI parity artifact directory and png extension', () => {
    const artifactRoot = electronUiParityArtifactRoot(repoRoot);
    expect(artifactRoot).toBe(path.resolve(repoRoot, '.omx/artifacts/electron-ui-parity'));
    expect(
      resolveScreenshotCapturePath('.omx/artifacts/electron-ui-parity/evidence.png', {
        repoRoot,
        isPackaged: false,
        nodeEnv: 'test',
      }),
    ).toEqual({ enabled: true, outputPath: path.join(artifactRoot, 'evidence.png') });
    expect(
      resolveScreenshotCapturePath('/tmp/leak.png', { repoRoot, isPackaged: false, nodeEnv: 'test' }),
    ).toEqual({ enabled: false, reason: 'invalid-path' });
    expect(
      resolveScreenshotCapturePath('.omx/artifacts/electron-ui-parity/not-png.txt', {
        repoRoot,
        isPackaged: false,
        nodeEnv: 'test',
      }),
    ).toEqual({ enabled: false, reason: 'invalid-path' });
  });

  it('allows packaged smoke captures only when explicitly enabled under .omx artifacts', () => {
    expect(
      resolveScreenshotCapturePath('.omx/artifacts/packaged-app-smoke/evidence.png', {
        repoRoot,
        isPackaged: true,
        nodeEnv: 'test',
        allowPackagedCapture: true,
      }),
    ).toEqual({ enabled: true, outputPath: path.resolve(repoRoot, '.omx/artifacts/packaged-app-smoke/evidence.png') });
    expect(
      resolveScreenshotCapturePath('/tmp/leak.png', {
        repoRoot,
        isPackaged: true,
        nodeEnv: 'test',
        allowPackagedCapture: true,
      }),
    ).toEqual({ enabled: false, reason: 'invalid-path' });
  });
});
