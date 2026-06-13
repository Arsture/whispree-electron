#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

const root = process.cwd();
const artifactRoot = resolve(root, process.env.WHISPREE_VISUAL_PARITY_ROOT ?? '.omx/artifacts/visual-parity');
const diffRoot = resolve(artifactRoot, 'diff');
const jsonPath = resolve(diffRoot, 'visual-parity-verdict.json');
const markdownPath = resolve(diffRoot, 'visual-parity-verdict.md');
const allowMissing = process.argv.includes('--allow-missing');

const tabs = ['home', 'general', 'stt', 'llm', 'models', 'word-sets', 'history'];
const thresholds = {
  home: { mae: 0.095, rms: 0.145, ratio25: 0.45, ratio50: 0.11 },
  general: { mae: 0.075, rms: 0.155, ratio25: 0.19, ratio50: 0.14 },
  stt: { mae: 0.075, rms: 0.155, ratio25: 0.19, ratio50: 0.14 },
  llm: { mae: 0.075, rms: 0.150, ratio25: 0.19, ratio50: 0.13 },
  models: { mae: 0.075, rms: 0.155, ratio25: 0.19, ratio50: 0.14 },
  'word-sets': { mae: 0.075, rms: 0.145, ratio25: 0.17, ratio50: 0.12 },
  history: { mae: 0.105, rms: 0.205, ratio25: 0.30, ratio50: 0.23 },
};
const minimumDimensions = minimumDimensionsFromEnv();

mkdirSync(diffRoot, { recursive: true });
const results = tabs.map(compareTab);
const blockers = results.flatMap((result) => result.blockers.map((blocker) => `${result.tab}:${blocker}`));
const failed = results.filter((result) => result.status === 'fail');
const warnings = results.filter((result) => result.status === 'warn');
const compared = results.filter((result) => result.status !== 'blocked');
const status = blockers.length > 0
  ? allowMissing ? 'blocked' : 'fail'
  : failed.length > 0
    ? 'fail'
    : warnings.length > 0
      ? 'warn'
      : 'pass';
const verdict = {
  ok: status === 'pass' || (allowMissing && status === 'blocked'),
  status,
  generatedAt: new Date().toISOString(),
  artifactRoot,
  diffRoot,
  comparedTabs: compared.length,
  totalTabs: tabs.length,
  thresholds,
  blockers,
  results,
};
writeFileSync(jsonPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown(verdict), 'utf8');
console.log(JSON.stringify({ ok: verdict.ok, status, jsonPath, markdownPath, blockers, comparedTabs: compared.length }, null, 2));
if (!verdict.ok) process.exit(1);

function compareTab(tab) {
  const electron = firstExisting(electronCandidates(tab));
  const swift = firstExisting(swiftCandidates(tab));
  const blockers = [];
  if (!electron) blockers.push('electron-png-missing');
  if (!swift) blockers.push('swift-png-missing');
  const outputDir = resolve(diffRoot, tab);
  mkdirSync(outputDir, { recursive: true });
  if (!electron || !swift) {
    return { tab, status: 'blocked', electron, swift, blockers, metrics: null, artifacts: {} };
  }
  const electronPng = readPng(electron);
  const swiftPng = readPng(swift);
  const width = Math.min(electronPng.width, swiftPng.width);
  const height = Math.min(electronPng.height, swiftPng.height);
  if (width <= 0 || height <= 0) blockers.push('invalid-comparison-dimensions');
  blockers.push(...dimensionBlockers(tab, electronPng, swiftPng, width, height));
  const electronNormalized = resizeNearest(electronPng, width, height);
  const swiftNormalized = resizeNearest(swiftPng, width, height);
  const { metrics, diff } = diffImages(electronNormalized, swiftNormalized, width, height);
  const threshold = thresholds[tab];
  const exceeded = Object.entries(threshold).filter(([key, max]) => metrics[key] > max).map(([key]) => key);
  const status = blockers.length > 0 ? 'blocked' : exceeded.length === 0 ? 'pass' : exceeded.length <= 2 ? 'warn' : 'fail';
  const diffPng = resolve(outputDir, `${tab}-diff.png`);
  const electronPngOut = resolve(outputDir, `${tab}-electron-normalized.png`);
  const swiftPngOut = resolve(outputDir, `${tab}-swift-normalized.png`);
  writePng(diffPng, width, height, diff);
  writePng(electronPngOut, width, height, electronNormalized);
  writePng(swiftPngOut, width, height, swiftNormalized);
  return {
    tab,
    status,
    electron,
    swift,
    blockers,
    exceeded,
    dimensions: {
      compared: { width, height },
      electron: { width: electronPng.width, height: electronPng.height },
      swift: { width: swiftPng.width, height: swiftPng.height },
    },
    metrics,
    threshold,
    artifacts: { diffPng, electronNormalized: electronPngOut, swiftNormalized: swiftPngOut },
  };
}

function electronCandidates(tab) {
  if (tab === 'home') return [resolve(artifactRoot, 'home/electron-home.png')];
  return [resolve(artifactRoot, `tabs/${tab}/${tab}.png`)];
}

function swiftCandidates(tab) {
  if (tab === 'home') return [resolve(artifactRoot, 'home/swift-home.png'), resolve(artifactRoot, 'swift-tabs/home-window.png')];
  return [
    resolve(artifactRoot, `tab-pairwise-corrected/${tab}-swift-content.png`),
    resolve(artifactRoot, `tab-pairwise-top/${tab}-swift-content.png`),
    resolve(artifactRoot, `swift-tabs-corrected/${tab}.png`),
    resolve(artifactRoot, `swift-tabs/${tab}.png`),
  ];
}

function firstExisting(paths) {
  return paths.find((candidate) => existsSync(candidate)) ?? null;
}

function diffImages(a, b, width, height) {
  const diff = Buffer.alloc(width * height * 4);
  let absolute = 0;
  let squared = 0;
  let ratio25 = 0;
  let ratio50 = 0;
  const pixels = width * height;
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    const dr = Math.abs(a[offset] - b[offset]);
    const dg = Math.abs(a[offset + 1] - b[offset + 1]);
    const db = Math.abs(a[offset + 2] - b[offset + 2]);
    const max = Math.max(dr, dg, db);
    const avg = (dr + dg + db) / 3;
    absolute += avg;
    squared += ((dr * dr) + (dg * dg) + (db * db)) / 3;
    if (max > 25) ratio25 += 1;
    if (max > 50) ratio50 += 1;
    diff[offset] = max;
    diff[offset + 1] = 20;
    diff[offset + 2] = 255 - max;
    diff[offset + 3] = 255;
  }
  return {
    diff,
    metrics: {
      mae: round(absolute / pixels / 255),
      rms: round(Math.sqrt(squared / pixels) / 255),
      ratio25: round(ratio25 / pixels),
      ratio50: round(ratio50 / pixels),
    },
  };
}

function dimensionBlockers(tab, electron, swift, comparedWidth, comparedHeight) {
  const blockers = [];
  const minimum = minimumDimensions[tab] ?? minimumDimensions.default;
  if (comparedWidth < minimum.width || comparedHeight < minimum.height) {
    blockers.push(`comparison-dimensions-too-small:${comparedWidth}x${comparedHeight}<${minimum.width}x${minimum.height}`);
  }
  const tolerance = tab === 'home' ? 0.1 : 0.03;
  const electronAspect = electron.width / electron.height;
  const swiftAspect = swift.width / swift.height;
  if (Math.abs(electronAspect - swiftAspect) > tolerance) blockers.push('aspect-ratio-mismatch');
  const scaleX = electron.width / swift.width;
  const scaleY = electron.height / swift.height;
  if (Math.abs(scaleX - scaleY) > tolerance) blockers.push('non-uniform-scale-mismatch');
  return blockers;
}

function minimumDimensionsFromEnv() {
  const override = process.env.WHISPREE_VISUAL_DIFF_MIN_DIMENSIONS;
  if (override) {
    const match = /^(\d+)x(\d+)$/.exec(override);
    if (!match) throw new Error(`WHISPREE_VISUAL_DIFF_MIN_DIMENSIONS must use WIDTHxHEIGHT, received ${override}`);
    const value = { width: Number(match[1]), height: Number(match[2]) };
    return Object.fromEntries(['default', ...tabs].map((tab) => [tab, value]));
  }
  return {
    default: { width: 800, height: 600 },
    home: { width: 1200, height: 900 },
    general: { width: 800, height: 600 },
    stt: { width: 800, height: 600 },
    llm: { width: 800, height: 600 },
    models: { width: 800, height: 600 },
    'word-sets': { width: 800, height: 600 },
    history: { width: 800, height: 600 },
  };
}

function resizeNearest(image, width, height) {
  if (image.width === width && image.height === height) return image.rgba;
  const output = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y / height) * image.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x / width) * image.width));
      image.rgba.copy(output, (y * width + x) * 4, (sourceY * image.width + sourceX) * 4, (sourceY * image.width + sourceX) * 4 + 4);
    }
  }
  return output;
}

function readPng(file) {
  const buffer = readFileSync(file);
  if (!buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error(`${file} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) throw new Error(`${file} uses unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}`);
  const channels = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const raw = Buffer.alloc(height * stride);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset++];
    const row = inflated.subarray(inputOffset, inputOffset + stride);
    const previous = y === 0 ? null : raw.subarray((y - 1) * stride, y * stride);
    const output = raw.subarray(y * stride, (y + 1) * stride);
    unfilter(row, output, previous, filter, channels);
    inputOffset += stride;
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * channels;
    const target = index * 4;
    rgba[target] = raw[source];
    rgba[target + 1] = raw[source + 1];
    rgba[target + 2] = raw[source + 2];
    rgba[target + 3] = channels === 4 ? raw[source + 3] : 255;
  }
  return { width, height, rgba };
}

function unfilter(row, output, previous, filter, bpp) {
  for (let i = 0; i < row.length; i += 1) {
    const left = i >= bpp ? output[i - bpp] : 0;
    const up = previous ? previous[i] : 0;
    const upLeft = previous && i >= bpp ? previous[i - bpp] : 0;
    if (filter === 0) output[i] = row[i];
    else if (filter === 1) output[i] = (row[i] + left) & 0xff;
    else if (filter === 2) output[i] = (row[i] + up) & 0xff;
    else if (filter === 3) output[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) output[i] = (row[i] + paeth(left, up, upLeft)) & 0xff;
    else throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function writePng(file, width, height, rgba) {
  mkdirSync(dirname(file), { recursive: true });
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunks = [chunk('IHDR', ihdr(width, height)), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))];
  writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks]));
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
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

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function renderMarkdown(value) {
  const rows = value.results.map((result) => `| ${result.tab} | ${result.status} | ${result.metrics ? result.metrics.mae : 'n/a'} | ${result.metrics ? result.metrics.rms : 'n/a'} | ${result.metrics ? result.metrics.ratio25 : 'n/a'} | ${result.metrics ? result.metrics.ratio50 : 'n/a'} | ${result.exceeded?.join(', ') ?? result.blockers.join(', ')} |`);
  return `# Automated Visual Tab Diff Verdict\n\nGenerated: ${value.generatedAt}\n\nStatus: **${value.status}**\n\nCompared tabs: ${value.comparedTabs}/${value.totalTabs}\n\n| Tab | Status | MAE | RMS | Ratio >25 | Ratio >50 | Notes |\n| --- | --- | ---: | ---: | ---: | ---: | --- |\n${rows.join('\n')}\n\n## Blockers\n\n${value.blockers.length > 0 ? value.blockers.map((item) => `- ${item}`).join('\n') : '- none'}\n`;
}
