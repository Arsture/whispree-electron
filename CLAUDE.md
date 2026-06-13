# CLAUDE.md

This repository is no longer the active macOS-only SwiftUI delivery lane. It is an isolated **Electron + Vite migration workspace** for rebuilding Whispree as a Codex-style cross-platform desktop app.

## Mission

Rebuild Whispree from the copied SwiftUI source into an Electron/Vite app that can support macOS and Windows while preserving the product behavior:

- hotkey-driven dictation
- STT provider abstraction
- LLM correction pipeline
- FIFO delivery semantics
- Quick Fix flow
- context-aware screenshot/browser/terminal assistance where platform support allows

The existing Swift/Xcode project remains in this repo only as a reference implementation until each area is migrated.

## Required First Read

Before making migration changes, read:

1. `AGENTS.md`
2. `docs/ELECTRON_REFACTOR_HANDOFF.md`
3. The scoped `AGENTS.md` file for any legacy Swift directory you inspect

## Repository Roles

- `/Users/arsture/ideas/whispree` — original SwiftUI repo. Do not modify from this migration session.
- `/Users/arsture/ideas/whispree-electron` — this Electron/Vite migration workspace.
- `Whispree/` — copied SwiftUI source for architecture and behavior reference.
- `WhispreeTests/` — copied Swift tests for expected behavior reference.
- `docs/ELECTRON_REFACTOR_HANDOFF.md` — handoff and migration plan for the next Codex session.

## Target Stack Direction

No Electron scaffold exists yet. When implementation starts, prefer:

- Electron + Electron Forge
- Vite
- React + TypeScript renderer
- typed preload IPC bridge
- shared TypeScript core for pure app logic
- main-process OS adapters for tray, shortcuts, permissions, and native integration
- workers/sidecars/native modules for expensive audio/STT/LLM/local model work
- SQLite/local storage only after the state schema is defined

Do not add dependencies casually. Add only what the current milestone needs.

## Architecture Rules

- Renderer must stay thin. Do not run STT, LLM, audio capture, or OS automation directly in React.
- Cross-platform core must not import macOS-only or Windows-only APIs.
- OS behavior must sit behind adapter interfaces.
- Preserve the legacy queue semantics: admission can be broad, provider work can be bounded/parallel, delivery is FIFO and serialized.
- Preserve LLM hallucination safety behavior, including word-edit-distance style checks.
- Treat AppleScript, Accessibility, Screen Recording, WhisperKit, MLX Swift, Sparkle, and Xcode signing as legacy macOS implementation details, not portable core.

## Suggested Directory Shape

The next implementation session may choose exact names, but this is the intended split:

```text
src/
  main/        Electron main process, app lifecycle, adapters, sidecar lifecycle
  preload/     typed IPC bridge only
  renderer/    React/Vite UI
  shared/      pure TypeScript models, schemas, provider contracts, queue logic
  workers/     optional JS workers for bounded background work
sidecars/       optional native/Rust/Python helpers for audio/STT/local models
```

## Migration Backlog Shape

Work in small slices:

1. Empty Electron shell with tray/menu/main window.
2. Shared settings and queue model.
3. Mock recording pipeline.
4. Global shortcut adapter.
5. Audio capture adapter.
6. Cloud STT provider path.
7. OpenAI/Groq correction path.
8. Text insertion adapter.
9. Quick Fix flow.
10. Screenshot/browser/terminal context adapters.
11. Local model strategy for macOS and Windows.
12. Packaging/updater story for both platforms.

## Commands

Current repo has no Electron package scripts yet. Until the scaffold exists, do not invent successful build commands.

Legacy Swift commands are reference-only and should be used only when explicitly validating old behavior:

```bash
xcodegen generate
xcodebuild -project Whispree.xcodeproj -scheme Whispree -destination 'platform=macOS,arch=arm64' build
xcodebuild -project Whispree.xcodeproj -scheme Whispree -destination 'platform=macOS,arch=arm64' test
```

After Electron scaffolding is added, update this file with the actual package manager commands, such as typecheck, lint, unit tests, and app smoke-run commands.

## Documentation Rules

- Keep migration handoffs under `docs/`.
- If a legacy Swift behavior is mapped to a new Electron module, document the mapping in the relevant migration doc or new module README.
- If user-facing behavior changes during the migration, update README/docs after the implementation stabilizes.

## Git Rules

- Work on `dev` unless the user explicitly asks otherwise.
- Keep commits small and reversible.
- Do not push or touch the original `/Users/arsture/ideas/whispree` repo.
- Commit only verified documentation or implementation slices.
