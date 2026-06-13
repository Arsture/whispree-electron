#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const root = process.cwd();
const tempRoot = mkdtempSync(resolve(tmpdir(), 'whispree-visual-diff-'));
const tabs = ['home', 'general', 'stt', 'llm', 'models', 'word-sets', 'history'];
for (const tab of tabs) {
  const electron = tab === 'home'
    ? resolve(tempRoot, 'home/electron-home.png')
    : resolve(tempRoot, `tabs/${tab}/${tab}.png`);
  const swift = tab === 'home'
    ? resolve(tempRoot, 'home/swift-home.png')
    : resolve(tempRoot, `tab-pairwise-corrected/${tab}-swift-content.png`);
  writeTinyPng(electron, tab.length * 7);
  writeTinyPng(swift, tab.length * 7);
}
const output = execFileSync('node', ['scripts/compare-visual-tabs.mjs'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, WHISPREE_VISUAL_PARITY_ROOT: tempRoot },
});
const parsed = JSON.parse(output);
if (parsed.ok !== true || parsed.status !== 'pass' || parsed.comparedTabs !== tabs.length) {
  throw new Error(`Expected passing visual diff verdict: ${output}`);
}
const artifact = JSON.parse(readFileSync(resolve(tempRoot, 'diff/visual-parity-verdict.json'), 'utf8'));
if (artifact.results.some((result) => result.metrics.mae !== 0 || result.status !== 'pass')) {
  throw new Error('Identical generated PNGs should produce zero-diff pass results');
}
console.log('Automated visual tab diff guard passed.');

function writeTinyPng(file, seed) {
  mkdirSync(dirname(file), { recursive: true });
  const rgba = Buffer.from([
    seed, 20, 40, 255, seed, 20, 40, 255,
    seed, 20, 40, 255, seed, 20, 40, 255,
  ]);
  writeFileSync(file, encodePng(2, 2, rgba));
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr(width, height)), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
