#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'src/shared/local-engine-manifest.json'), 'utf8'));
const output = execFileSync('node', ['scripts/real-readiness-probe.mjs'], { cwd: root, encoding: 'utf8' });
const parsed = JSON.parse(output);
if (parsed.ok !== true) throw new Error('Readiness probe summary must report ok: true');
const artifact = JSON.parse(readFileSync(resolve(root, '.omx/artifacts/real-os-ai-permissions-parity/readiness-probe.json'), 'utf8'));

for (const probe of [artifact]) {
  if (!probe.localAi.windowsAvoidsMlx) throw new Error('Windows local AI policy must avoid MLX');
  if (probe.localAi.manifestPath !== 'src/shared/local-engine-manifest.json') throw new Error('Probe must record shared manifest path');
  const manifestWindowsIds = manifest.filter((engine) => engine.provider.platform === 'windows').map((engine) => engine.id).sort();
  const probeWindowsIds = probe.localAi.windowsEngines.map((engine) => engine.id).sort();
  if (JSON.stringify(manifestWindowsIds) !== JSON.stringify(probeWindowsIds)) {
    throw new Error(`Probe Windows engines drifted from manifest: ${JSON.stringify(probeWindowsIds)} vs ${JSON.stringify(manifestWindowsIds)}`);
  }
  for (const engine of probe.localAi.windowsEngines) {
    if (/mlx/i.test(`${engine.id} ${engine.runtime}`)) throw new Error(`Windows engine leaks MLX identity: ${engine.id}`);
  }
}
console.log('Real readiness probe manifest/non-MLX guard passed.');
