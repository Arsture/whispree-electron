#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];

const requireIncludes = (label, text, snippets) => {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${label} is missing required snippet: ${snippet}`);
    }
  }
};

const requireNotIncludes = (label, text, snippets) => {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      failures.push(`${label} still contains forbidden snippet: ${snippet}`);
    }
  }
};

const electronCi = read('.github/workflows/electron-ci.yml');
requireIncludes('electron-ci.yml', electronCi, [
  'pull_request:',
  'push:',
  'macos-latest',
  'windows-latest',
  'node-version: 22.12.0',
  'npm ci',
  'npm run check:workflows',
  'npm run check:boundaries',
  'npm run typecheck',
  'npm run lint',
  'npm test',
  'npm run probe:real',
  'npm run signing:preflight',
  'npm run parity:capture',
  'npm run package',
  'actions/upload-artifact@v4',
]);


const electronRelease = read('.github/workflows/electron-release.yml');
requireIncludes('electron-release.yml', electronRelease, [
  'workflow_dispatch:',
  'confirm_electron_release',
  "github.event.inputs.confirm_electron_release == 'I understand this builds Electron release artifacts'",
  'macos-latest',
  'windows-latest',
  'npm run verify',
  'npm run signing:preflight:release',
  'npm run probe:real',
  'npm run make',
  'actions/upload-artifact@v4',
  'draft: true',
]);
requireNotIncludes('electron-release.yml', electronRelease, [
  '  push:\n',
  '  release:\n',
]);

const legacyRelease = read('.github/workflows/release.yml');
requireIncludes('release.yml', legacyRelease, [
  'workflow_dispatch:',
  'confirm_legacy_xcode_release',
  "github.event.inputs.confirm_legacy_xcode_release == 'I understand this is the legacy Swift release path'",
  'xcodebuild -project Whispree.xcodeproj',
]);
requireNotIncludes('release.yml', legacyRelease, [
  '  push:\n',
  '    branches:\n      - main',
]);

const legacyNotes = read('.github/workflows/update-release-notes.yml');
requireIncludes('update-release-notes.yml', legacyNotes, [
  'workflow_dispatch:',
  'release_id:',
  'confirm_legacy_sparkle_notes',
  "github.event.inputs.confirm_legacy_sparkle_notes == 'I understand this updates legacy Sparkle release notes'",
  'peaceiris/actions-gh-pages@v3',
]);
requireNotIncludes('update-release-notes.yml', legacyNotes, [
  '  release:\n',
  'types: [edited]',
]);

if (failures.length > 0) {
  console.error('Workflow safety checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Workflow safety checks passed for Electron CI and gated legacy release workflows.');
