# Whispree Electron Migration Roadmap

This roadmap is the repo-native mirror of the active Autopilot migration plan. The source-of-truth planning artifacts live under `.omx/plans/`, but this file is committed so future contributors can see the full migration contract without relying on local OMX state.

## Execution contract

- Execution stride: milestone.
- Scope shrink policy: deny unless blocked by credentials, external production authority, unavailable hardware, or destructive actions.
- Original Swift repo: `/Users/arsture/ideas/whispree` remains read-only/untouched.
- Migration repo: `/Users/arsture/ideas/whispree-electron` owns all Electron work.
- UI parity: preserve the Swift glassy/sidebar/tab identity; do not claim pixel-perfect parity until Swift/Electron side-by-side visual evidence exists.
- Renderer boundary: no Electron, Node OS APIs, credentials, adapter implementations, STT/LLM/audio work, or filesystem access in renderer.

## Milestone tree

| Milestone | Outcome | Evidence gate |
| --- | --- | --- |
| M0 Contract and ledger | Full PRD/test-spec/ledger exists and is approved. | Architect approval followed by Critic approval. |
| M1 Renderer architecture split | `App.tsx` decomposed into focused renderer modules without visual drift. | UI tests, CSS contract, screenshot. |
| M2 Settings schema/store/UI | Swift settings defaults/migrations become shared schema plus main-owned persistence and renderer controls. | Defaults/migration/store/IPC/renderer tests. |
| M3 Provider registry/cloud scaffolds | STT/LLM/local/cloud provider choices become switchable descriptors with credential-safe cloud scaffolds. | Request builder, missing credential, redaction tests. |
| M4 OS adapter foundation | Hotkey/audio/text/permissions/context/media/updater interfaces and platform factory. | darwin/win32/unknown factory tests and visible not-tested states. |
| M5 Recording pipeline abstraction | Mock recording evolves into adapter-driven recording/hotkey/audio/provider pipeline. | FIFO, cancel, adapter failure, provider failure tests. |
| M6 Delivery/history | FIFO text insertion behind adapter with clipboard fallback and persistent history. | Delivery/history/fallback IPC tests. |
| M7 Context and Quick Fix | Screenshot/browser/terminal/Quick Fix foundations and UI surfaces. | FIFO-head screenshot, immutable context, Quick Fix dictionary tests. |
| M8 Local AI sidecar/backend switching | stdio JSON sidecar protocol, macOS MLX/WhisperKit descriptors, Windows placeholders. | Protocol schema and backend switching tests. |
| M9 CI/CD migration | Electron CI/package/make workflows replace Xcode-first assumptions safely. | Static workflow checks and local verification. |
| M10 Final review/QA | Visual/behavior evidence, code review, UltraQA, final ledger. | `APPROVE` + `CLEAR`, UltraQA pass/explicit skip. |

## Verification cadence

Run after material milestones:

```bash
npm run check:boundaries
npm run typecheck
npm run lint
npm test
git diff --check
```

Run when Electron packaging/runtime changes:

```bash
npm run package
WHISPREE_CAPTURE_SCREENSHOT=.omx/artifacts/<scope>/<name>.png npm start
```

## Blocker labeling

The following are not skipped silently. They must remain `credential-gated`, `not-tested`, `unsupported`, or explicitly blocked until evidence exists:

- Groq/OpenAI/Codex real credentials.
- Real microphone, Accessibility, Screen Recording, Automation/TCC grants.
- Apple signing/notarization and Windows signing secrets.
- Windows runtime execution on Windows hardware.
- Pixel-perfect visual parity.
