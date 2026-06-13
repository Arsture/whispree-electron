# Whispree Electron Migration Baseline

- Created: 2026-06-13
- Scope: first runnable Electron migration milestone
- Source baseline: copied SwiftUI/Xcode app in this repository; original repo `/Users/arsture/ideas/whispree` remains read-only/untouched for this migration run.
- Approved first milestone: detailed roadmap + Electron/Vite shell + typed boundaries + mock recording/FIFO queue/dashboard flow. Real local AI, real cloud E2E, production release CI/CD, and Windows hardware execution are deferred.

## Status Vocabulary

Use this vocabulary in code and UI copy so the app never overclaims readiness:

| Status | Meaning |
| --- | --- |
| `mock` | Implemented only as deterministic test/demo behavior in this milestone. |
| `planned` | Designed/backlogged but not implemented in this milestone. |
| `unsupported` | Not supported by the current adapter/platform path. |
| `not-tested` | Interface or scaffold exists, but the platform/provider has not been executed in this milestone. |

## Target Module Ownership

| Target area | Owns | Must not own |
| --- | --- | --- |
| `src/shared` | Settings schema, queue state machine, provider/adapter interfaces, prompts, safety helpers, status vocabulary, serializable IPC types. | Electron, Node OS APIs, filesystem/process calls, renderer components, platform adapter implementations. |
| `src/main` | Electron lifecycle, window/tray/menu shell, IPC handlers, mock pipeline owner, future adapter/sidecar orchestration. | React rendering, direct heavy AI/audio in the renderer, untyped channel strings outside shared IPC definitions. |
| `src/preload` | `contextBridge` surface for a small typed `window.whispree` API. | Raw `ipcRenderer` exposure, arbitrary channel send/listen, filesystem/shell primitives. |
| `src/renderer` | Lightweight React dashboard/settings/history projection through preload API. | `electron`, Node APIs, STT/LLM/audio work, adapter implementations. |
| `src/adapters` / `src/main/adapters` | OS-specific implementation classes for microphone, hotkey, text insertion, screen/context capture, permissions, updater. | Shared policy/order logic. |
| `sidecars/` / `src/workers` | Future local model/audio helper processes with line-delimited JSON protocols. | Renderer UI and shared state policies. |
| CI/CD | Later Electron package/sign/update workflows. | This milestone's core app behavior. |

## Legacy Feature Inventory and Migration Map

| # | Legacy feature | Swift reference | Target module(s) | First milestone status | Test / parity strategy |
| --- | --- | --- | --- | --- | --- |
| 1 | Menu bar app / tray UX | `Whispree/App/*`, `Whispree/Views/MenuBar/MenuBarView.swift`; NSStatusItem + NSWindow pattern per `Whispree/Views/AGENTS.md`. | `src/main` for tray/menu/window; `src/renderer` for dashboard. | `mock` / shell only | Verify Electron window opens/builds; tray existence marked `not-tested` if current session cannot visually inspect desktop tray. |
| 2 | Global hotkey recording start/stop | `Whispree/Services/Hotkey/*`, `Whispree/Models/WhispreeShortcut.swift`, `AppSettings.toggleRecordingShortcut`. | `src/shared` shortcut schema; future `HotkeyAdapter` per OS in main. | `planned` | Unit-test adapter contract/status labels; real global shortcut deferred to OS-adapter slice. |
| 3 | Audio recording, 16kHz mono, waveform FFT/VAD | `Whispree/Services/Audio/AudioService.swift`, `AppState.frequencyBands`, `AppSettings.audioInputChannel`, `vadEnabled`. | Future `AudioCaptureAdapter`; renderer only displays state/waveform projection. | `planned` | No microphone access in this milestone; mock recording state and waveform placeholder only. |
| 4 | DictationQueue FIFO delivery | `Whispree/Models/DictationQueue.swift`, `Whispree/Coordinators/RecordingCoordinator.swift`; invariants in scoped AGENTS. | `src/shared` queue state machine; `src/main` pipeline owner; `src/renderer` projection. | `mock` | Unit tests: immutable sequence snapshots, out-of-order processing cannot deliver ahead of FIFO head, failed/canceled/skipped terminal jobs unblock later ready jobs, active recording blocks delivery. |
| 5 | STT providers: WhisperKit, Groq, MLX Audio | `Whispree/Services/STT/*`, `mlx-worker/mlx_worker.py`. | `src/shared` `STTProvider` and `LocalModelBackend` contracts; future cloud/sidecar implementations in main/adapters. | `mock` interface; real providers `planned` | Mock STT returns deterministic text; matrix captures macOS/Windows backend strategy. |
| 6 | LLM correction providers: None, MLX text/vision, OpenAI/Codex auth, Groq | `Whispree/Services/LLM/*`, `mlx-worker/mlx_llm_worker.py`, `CodexAuthService`. | `src/shared` `LLMProvider`, prompt templates, auth/provider metadata; future main/sidecar providers. | `mock` interface; real providers `planned` | Mock LLM preserves original text and deterministic correction; prompt module exports stable IDs without network calls. |
| 7 | Screenshot capture + VLM context correction | `Whispree/Services/ScreenCapture/*`, `CapturedScreenshot`, `ScreenshotSelectionView`. | Future `ScreenContextAdapter`, renderer screenshot-selection UI, main delivery gate. | `planned` | Contract/status cards only. Real screen recording permission and selection modal deferred. |
| 8 | Browser context capture/restore | `Whispree/Services/BrowserContext/*`; Chrome AppleScript + TCC prompt constraints. | Future `BrowserContextAdapter` behind main. | `planned` | Status label `planned`; tests ensure shared context type is serializable without AppleScript. |
| 9 | Terminal context capture/restore | `Whispree/Services/TerminalContext/*`; iTerm2 AppleScript + tmux CLI. | Future `TerminalContextAdapter` behind main. | `planned` | Status label `planned`; Windows terminal strategy remains `not-tested`. |
| 10 | Text/image insertion to target app | `Whispree/Services/TextInsertion/TextInsertionService.swift`; clipboard + CGEvent Cmd+V; Accessibility required. | Future `TextInsertionAdapter`; shared delivery policy remains platform-neutral. | `planned` | Mock delivery records history only; no real clipboard/AX in this milestone. |
| 11 | Quick Fix selected text correction + dictionary registration | `Whispree/Services/QuickFix/*`, `Views/QuickFix`, `DomainWordSets`. | Future Quick Fix adapter + renderer panel; shared dictionary/settings contracts now. | `planned` | Baseline/backlog only; dictionary model contract included. |
| 12 | Settings persistence + provider/model controls | `Whispree/Models/AppSettings.swift`, `UserDefault.swift`, settings views. | `src/shared` settings defaults/schema; future local storage boundary in main. | `mock` defaults | Type/unit tests verify defaults and serializable provider selection; persistence backend deferred. |
| 13 | Model compatibility / local model management | `DeviceCapability.swift`, `LocalModelSpec.swift`, `ModelCompatibility.swift`, `ModelManager.swift`, `ModelMetricsView.swift`. | `src/shared` backend registry/contracts; future sidecar/model manager. | `planned` | Registry represents macOS MLX-like and Windows placeholder strategies without importing implementations. |
| 14 | Sparkle auto-update / release workflow | `.github/workflows/release.yml`, `RELEASE.md`, `Casks/whispree.rb`. | Later CI/CD/release milestone. | `planned` | Current Xcode/Sparkle/Homebrew flow documented; no workflow edits in this milestone unless explicitly scheduled later. |

## Behavior Baseline to Preserve

### Queue and delivery

- Queue admission is not artificially capped; resource safety is handled through cleanup/retention and future pressure handling.
- STT/LLM may process in parallel under provider-specific permits, but delivery/text/image insertion is strict FIFO and serialized.
- A later job that finishes before an earlier non-terminal job must not become deliverable to the user until the earlier job is terminal or delivered.
- Failed, canceled, copied-to-clipboard, skipped, or delivered jobs are terminal and unblock later ready jobs.
- Active recording blocks delivery; a new recording pauses screenshot selection/delivery and resumes FIFO scheduling after recording ends.
- ESC/cancel is scoped: preview -> active recording -> active delivery/screenshot selection -> explicit foreground job. It must not wipe passive background jobs.
- Each queued job owns immutable capture/settings/provider/context/screenshot snapshots so later setting changes do not mutate in-flight behavior.

### Permissions and target-app context

- Microphone, Accessibility, Screen Recording, and Automation permissions are user-visible first-class states.
- macOS Automation prompts for Chrome/iTerm/Music/Spotify have blocking/TCC constraints; Electron adapters must not bury these in shared core.
- Text insertion uses target app restoration plus clipboard/keyboard-event semantics; if no valid target exists, fallback is clipboard/history, not silent data loss.
- Browser/terminal context capture is job-scoped and restored only during that job's FIFO delivery.

### UI details and calmness

- SwiftUI reference uses dashboard/settings/history/sidebar, menu bar popover, transcription overlay, screenshot selection modal, Quick Fix panel, design tokens, status/compatibility badges, model metrics, and permission rows.
- Parallel processing UI should stay calm: queue counts and foreground/cancel scope over many spinners.
- Renderer should expose explicit deferred labels (`mock`, `planned`, `unsupported`, `not-tested`) so users do not infer full Windows, AI, or release readiness.
- Screenshot selection must remain a FIFO-head-only interaction in future slices.

## AI Backend Matrix

| Backend family | macOS strategy | Windows strategy | Shared abstraction | First milestone status |
| --- | --- | --- | --- | --- |
| Mock STT/LLM | Deterministic in-process mock owned by main/shared tests. | Same deterministic mock. | `STTProvider`, `LLMProvider`, `ProviderStatus`. | `mock` |
| Cloud STT (Groq) | Main-process provider using API key from secure settings later. | Same provider if credentials/network available. | `STTProvider` + credential boundary. | `planned` |
| Cloud LLM (OpenAI/Codex/Groq) | Main-process provider; Codex auth reuse needs explicit credential boundary. | Same if auth strategy supports Windows. | `LLMProvider` + auth boundary. | `planned` |
| Local STT (WhisperKit/CoreML/ANE) | macOS sidecar/native adapter; legacy path is WhisperKit. | Not applicable directly. | `LocalModelBackend` capability registry. | `planned` |
| Local STT (MLX Audio) | Python sidecar protocol similar to `mlx-worker/mlx_worker.py`; macOS/Apple Silicon-oriented. | `unsupported` until an equivalent backend is selected. | `LocalModelBackend` + sidecar protocol. | `planned` / Windows `unsupported` |
| Local LLM/VLM (MLX) | Python sidecar protocol similar to `mlx-worker/mlx_llm_worker.py`; text and vision capabilities. | `unsupported` until DirectML/ONNX/llama.cpp/vLLM-like backend is selected. | `LocalModelBackend` with capability + platform support. | `planned` / Windows `not-tested` |
| Future Windows local backend | Not needed for macOS. | Candidate adapter behind the same interface; exact runtime intentionally undecided this pass. | `LocalModelBackend` with `platforms` and `status`. | `planned`, `not-tested` |

## Current CI/CD Baseline

Current `.github/workflows/release.yml` is macOS/Xcode-centric:

1. Runs on `macos-latest` and sets up latest stable Xcode.
2. Installs XcodeGen through Homebrew and runs `xcodegen generate`.
3. Determines semantic version from commit message or tags.
4. Builds `Whispree.xcodeproj` for macOS arm64.
5. Imports Apple signing certificate from secrets and codesigns `Whispree.app`.
6. Produces ZIP and DMG artifacts.
7. Downloads Sparkle 2.6.0, signs update, generates `appcast.xml` and release notes.
8. Creates GitHub Release and deploys appcast to GitHub Pages.
9. Updates Homebrew tap cask with ZIP hash and macOS/arm64 constraints.

Electron CI/CD migration is a later milestone. Expected future direction: Node install from lockfile, test/typecheck/lint, Forge package/make matrix, separate macOS signing/notarization and Windows signing/installers, updater replacement/appcast strategy, release notes, and artifact publishing. No production release, signing, appcast, or Homebrew mutation is part of this first runnable milestone.

## First-Milestone Verification Baseline

Required automated checks once scaffold exists:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run package
git diff --check
```

Required static gates:

- `src/shared/**` has no Electron, Node OS API, renderer, main, or adapter implementation imports.
- `src/renderer/**` has no Electron, Node OS API, main-process, or adapter implementation imports.
- IPC channel names are centralized in shared/preload types.
- `BrowserWindow` uses `contextIsolation: true` and `nodeIntegration: false`.
- Preload exposes only named `window.whispree`, not raw `ipcRenderer`.
- `/Users/arsture/ideas/whispree` remains untouched by this migration run.

## Parity Checklist for Future Reviews

- [ ] Menu bar/tray shell parity observed on macOS.
- [ ] Global hotkey conflict and permission UX parity.
- [ ] Microphone recording, VAD, 16kHz mono conversion, and waveform parity.
- [ ] FIFO queue/cancel/delivery semantics covered by TypeScript tests.
- [ ] Cloud Groq STT path connected with secrets-safe config.
- [ ] OpenAI/Codex/Groq correction path connected with auth boundaries.
- [ ] macOS local MLX/WhisperKit-compatible sidecar path implemented.
- [ ] Windows local AI backend selected and executed on Windows.
- [ ] Screenshot capture/selection/VLM context parity.
- [ ] Browser/terminal context capture and restore parity or explicit unsupported UX.
- [ ] Text/image insertion adapter parity and clipboard fallback.
- [ ] Quick Fix selected-text correction and dictionary registration.
- [ ] Settings persistence migration/backward compatibility.
- [ ] Model compatibility/model download UX and progress.
- [ ] Electron CI/CD/signing/updater workflows replace Xcode/Sparkle/Homebrew baseline.

## Evidence Used

- `docs/ELECTRON_REFACTOR_HANDOFF.md`
- `AGENTS.md`, `CLAUDE.md`
- Scoped legacy guidance under `Whispree/**/AGENTS.md` and `WhispreeTests/AGENTS.md`
- `Whispree/App/AppState.swift`
- `Whispree/Models/AppSettings.swift`, `DictationQueue.swift`, `TranscriptionState.swift`
- `Whispree/Services/**` guidance for STT, LLM, permissions, audio, screen/browser/terminal context, text insertion, Quick Fix, media playback
- `mlx-worker/mlx_worker.py`, `mlx-worker/mlx_llm_worker.py`
- `.github/workflows/release.yml`
