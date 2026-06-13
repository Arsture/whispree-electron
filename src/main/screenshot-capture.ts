import path from 'node:path';

export interface ScreenshotCaptureEnvironment {
  readonly repoRoot: string;
  readonly isPackaged: boolean;
  readonly nodeEnv: string | undefined;
  readonly allowPackagedCapture?: boolean;
}

export type ScreenshotCaptureResolution =
  | { readonly enabled: false; readonly reason: 'not-requested' | 'packaged-app' | 'production-env' | 'invalid-path' }
  | { readonly enabled: true; readonly outputPath: string };

const artifactRootSegments = ['.omx', 'artifacts', 'electron-ui-parity'] as const;

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function electronUiParityArtifactRoot(repoRoot: string): string {
  return path.resolve(repoRoot, ...artifactRootSegments);
}

export function resolveScreenshotCapturePath(
  requestedPath: string | undefined,
  environment: ScreenshotCaptureEnvironment,
): ScreenshotCaptureResolution {
  if (!requestedPath) return { enabled: false, reason: 'not-requested' };
  if (environment.isPackaged && !environment.allowPackagedCapture) return { enabled: false, reason: 'packaged-app' };
  if (environment.nodeEnv === 'production') return { enabled: false, reason: 'production-env' };

  const artifactRoot = environment.allowPackagedCapture
    ? path.resolve(environment.repoRoot, '.omx', 'artifacts')
    : electronUiParityArtifactRoot(environment.repoRoot);
  const resolvedPath = path.resolve(environment.repoRoot, requestedPath);
  if (!isInside(artifactRoot, resolvedPath) || path.extname(resolvedPath).toLowerCase() !== '.png') {
    return { enabled: false, reason: 'invalid-path' };
  }
  return { enabled: true, outputPath: resolvedPath };
}
