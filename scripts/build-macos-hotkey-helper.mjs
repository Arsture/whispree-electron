#!/usr/bin/env node
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const objcSource = resolve(root, 'macos-hotkey-helper/whispree-hotkey-helper.m');
const outputDir = resolve(root, 'build/macos-hotkey-helper');
const output = resolve(outputDir, 'whispree-hotkey-helper');

if (process.platform !== 'darwin') {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'macOS hotkey helper builds only on darwin.', output: null }, null, 2));
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });
const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
const args = [
  '-target', `${arch}-apple-macosx13.0`,
  '-fobjc-arc',
  objcSource,
  '-o', output,
  '-framework', 'AppKit',
  '-framework', 'ApplicationServices',
  '-framework', 'Foundation',
];
const result = spawnSync('clang', args, { cwd: root, encoding: 'utf8' });
if (result.status !== 0 || result.error) {
  console.error(JSON.stringify({ ok: false, command: 'clang', args, stderr: result.stderr, error: result.error?.message ?? null }, null, 2));
  process.exit(result.status || 1);
}
if (!existsSync(output)) {
  console.error(JSON.stringify({ ok: false, error: 'clang succeeded but helper binary is missing', output }, null, 2));
  process.exit(1);
}
copyFileSync(output, resolve(outputDir, 'whispree-hotkey-helper.latest'));
console.log(JSON.stringify({ ok: true, skipped: false, command: 'clang', args, output }, null, 2));
