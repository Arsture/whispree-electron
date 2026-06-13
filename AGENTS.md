<!-- Updated: 2026-06-13 -->

# Whispree Electron Migration Workspace

## Purpose

This repository is an isolated migration workspace for turning the original macOS-only SwiftUI Whispree app into a **Codex-style Electron + Vite desktop app** that can target macOS and Windows.

- Original SwiftUI repo: `/Users/arsture/ideas/whispree`
- This migration repo: `/Users/arsture/ideas/whispree-electron`
- Do not modify the original repo from this workspace.
- Treat the existing `Whispree/` Swift files as reference material until a replacement Electron structure is created.

## Current Migration Status

- The repo currently contains a copied SwiftUI/Xcode app plus migration docs.
- Electron/Vite scaffolding has **not** been added yet.
- The next implementation session should read `docs/ELECTRON_REFACTOR_HANDOFF.md` before creating `package.json`, Electron Forge config, Vite config, or source folders.

## Target Architecture

Build toward a thin Electron shell with clear process boundaries:

```text
Electron main process
  ├─ tray/menu/window lifecycle
  ├─ global shortcut registration
  ├─ OS permission/adapters
  ├─ sidecar/worker lifecycle
  └─ SQLite/local storage boundary

preload bridge
  └─ typed, minimal IPC API

Vite renderer
  ├─ React/TypeScript UI
  ├─ settings/dashboard/queue state display
  └─ no heavy STT/LLM/audio work

shared core
  ├─ settings schema
  ├─ queue state machine
  ├─ provider interfaces
  ├─ prompt templates
  └─ safety helpers such as word-edit-distance

OS adapters / sidecars
  ├─ audio capture
  ├─ text insertion
  ├─ screen capture
  ├─ browser/terminal context
  └─ local STT/LLM backends
```

## Migration Principles

- Do not attempt a 1:1 Swift-to-TypeScript translation.
- Extract behavior, state machines, provider contracts, UX flows, and safety constraints from the Swift app.
- Keep renderer code lightweight. Heavy work belongs in main process, workers, sidecars, or native modules.
- Keep cross-platform core free of macOS-only APIs.
- Add OS-specific behavior behind explicit adapter interfaces.
- Prefer small commits: scaffold, then one capability slice at a time.
- Preserve a runnable/checkable state after every implementation step.

## Legacy Source Map

Use the copied Swift app as the migration source of truth:

| Legacy path | Migration use |
| --- | --- |
| `Whispree/App/` | app lifecycle, state ownership, settings defaults |
| `Whispree/Coordinators/` | recording queue orchestration and FIFO delivery behavior |
| `Whispree/Models/` | shared core models, settings schema, provider metadata |
| `Whispree/Services/Audio/` | audio capture requirements and waveform behavior |
| `Whispree/Services/STT/` | STT provider contracts and cloud/local backend behavior |
| `Whispree/Services/LLM/` | correction providers, prompts, safety thresholds |
| `Whispree/Services/Hotkey/` | global shortcut UX and conflict rules |
| `Whispree/Services/TextInsertion/` | target-app insertion semantics and fallback behavior |
| `Whispree/Services/ScreenCapture/` | screenshot context behavior and permission UX |
| `Whispree/Services/BrowserContext/` | browser context capture/restore requirements |
| `Whispree/Services/TerminalContext/` | terminal context capture/restore requirements |
| `Whispree/Views/` | UI/UX reference only; renderer should be redesigned in React |
| `WhispreeTests/` | behavior/test inspiration for the new TypeScript test suite |

## Recommended First Implementation Milestones

1. Create the minimal Electron + Vite + React + TypeScript scaffold.
2. Define `main`, `preload`, `renderer`, and `shared` directories with typed IPC boundaries.
3. Port only pure shared logic first: settings schema, queue model, provider interfaces, prompt helpers.
4. Add tray/menu/window shell and a settings/dashboard placeholder.
5. Add a mock recording pipeline to prove FIFO queue and UI update flow.
6. Add one real provider path, preferably cloud STT or OpenAI correction, before local model work.
7. Add OS adapters one by one: hotkey, audio, text insertion, screenshot/context.

## Verification Expectations

Before claiming completion for Electron work:

- Run the narrowest relevant test/typecheck/lint command available.
- For UI changes, run the app locally and smoke-test the changed flow when possible.
- Do not run legacy Xcode build unless explicitly validating the copied Swift reference.
- Do not claim Windows readiness until the Windows adapter path has been executed or explicitly marked untested.

## Commit Guidance

Use concise commits with the project lore-style trailers when useful. Future migration commits should state why a boundary or technology choice was made, not just what files changed.
