# Electron Real Logic Parity Map

Updated: 2026-06-13

This document is the SSoT implementation checklist for wiring the Electron migration to behave like the original Swift Whispree app. The original Swift repo at `/Users/arsture/ideas/whispree` is read-only reference material and must not be modified from this workspace.

## Source-of-truth anchors

| Area | Swift SSoT | Electron target |
| --- | --- | --- |
| Recording coordination | `Whispree/Coordinators/RecordingCoordinator.swift` | main-owned recording controller + dictation pipeline |
| Queue state machine | `Whispree/Models/DictationQueue.swift` | `src/shared/queue.ts`, `src/main/mock-pipeline.ts` |
| Settings defaults/migrations | `Whispree/Models/AppSettings.swift` | `src/shared/settings.ts`, `src/main/settings-store.ts` |
| Domain word sets | `Whispree/Models/DomainWordSets.swift`, `Views/Settings/DomainWordSetsView.swift` | `src/shared/settings.ts`, `src/renderer/panels/DomainWordSetsPanelMock.tsx` |
| History | `Whispree/App/AppState.swift`, `Views/Transcription/TranscriptionHistoryView.swift` | `src/main/history-store.ts`, `src/renderer/panels/HistoryPanel.tsx` |
| STT | `Services/STT/*` | `src/shared/providers.ts`, `src/main/provider-router.ts`, sidecars |
| LLM/correction | `Services/LLM/*`, especially `CorrectionPrompts.swift` | `src/shared/prompts.ts`, `src/main/cloud-provider-requests.ts`, `src/main/cloud-provider-executor.ts` |
| Hotkeys | `Services/Hotkey/*` | `src/main/recording-controller.ts`, hotkey adapter |
| Permissions | `Services/Permissions/PermissionManager.swift` | permission adapter + permission cards/request IPC |
| Text insertion | `Services/TextInsertion/TextInsertionService.swift` | `TextInsertionAdapter` implementations |
| Browser context | `Services/BrowserContext/*` | `BrowserContextAdapter` implementations |
| Terminal context | `Services/TerminalContext/*` | `TerminalContextAdapter` implementations |
| Screen context | `Services/ScreenCapture/*` | `ScreenContextAdapter` implementations |
| Media pause/resume | `Services/MediaPlayback/MediaPlaybackService.swift` | media playback adapter seam |
| Quick Fix | `Services/QuickFix/QuickFixService.swift`, `Views/QuickFix/QuickFixPanelView.swift` | quick-fix service/IPC/UI surface |
| Local AI/model management | `Models/LocalModelSpec.swift`, `ModelCompatibility.swift`, `Services/ModelManagement/ModelManager.swift` | local engine registry + model tab/store/actions |

## Behavioral parity invariants

1. **Renderer stays thin.** Heavy STT, LLM, local model, OS control, and storage work belong in main, workers, sidecars, or native adapters.
2. **Swift behavior is authoritative.** Electron may use different OS implementations, but user-level semantics must match the Swift code unless explicitly documented as not-tested or unsupported.
3. **Platform differences are adapter-only.** Cross-platform core state and sequencing should change in one place; macOS/Windows differences live behind OOP-style interfaces.
4. **Settings snapshot per job.** Queued jobs must preserve settings/provider/glossary/screenshot flags captured at recording stop/start time; later settings changes must not mutate older jobs.
5. **FIFO delivery is recording-gated.** STT/LLM may process in background, but target restore, paste, screenshot selection, image insertion, and history write are serialized and must not begin during recording.
6. **Scoped cancellation.** ESC/hotkey cancel affects only the active recording, active screenshot selection/delivery, or foreground queue item; it must not wipe unrelated background work.
7. **Credentials stay bounded.** Groq/OpenAI keys are never written to public snapshots; real network calls require explicit runtime credentials.
8. **Windows local AI is never MLX.** Windows sidecars use whisper.cpp/ONNX/llama.cpp-style engines and remain not-tested until executed on Windows.
9. **Original repo untouched.** Verification must include `git -C /Users/arsture/ideas/whispree status --short --branch`.

## Tab-by-tab actual logic backlog

### Home / recording dashboard

Swift behavior:
- `RecordingCoordinator.startRecording()` validates provider readiness, captures target context, starts optional continuous screenshot capture, starts audio service, updates overlay state, and pauses media if enabled.
- `stopRecording()` stops capture/audio, skips empty/silent audio, enqueues a per-job snapshot, resumes media, then schedules STT/LLM/delivery.
- `cancel()` is scoped by active recording, delivery job, or foreground job.

Electron gap:
- Hotkey controller currently starts mock dictation instead of real microphone capture.
- Media pause/resume is not yet an adapter seam.
- Pipeline class is still named `MockDictationPipeline` even though it now owns real provider routing.

Implementation path:
- Add explicit controller actions for `pressRecordingShortcutDown`, `pressRecordingShortcutUp`, `toggleRecording`, and `cancelScope`.
- Use `recordingMode` to select push-to-talk vs toggle semantics.
- Prefer real recording path from renderer/preload when the user invokes recording; keep mock only as explicit dev action.
- Preserve queue delivery gate and add tests for active-recording cancel and foreground-job cancel.

### General settings

Swift behavior:
- `AppSettings` persists each setting field, migrates legacy blob/hotkey storage, supports launch at login, overlay visibility, recording mode, language, shared dictionary, browser/terminal restore, permissions, and automation guidance.
- `HotkeyManager.reloadHotkeys()` rebinds shortcuts after changes.

Electron gap:
- Visible general controls mostly update settings, but hotkey re-registration after shortcut changes is incomplete.
- Permission rows in General are UI-only in some places; Home permission cards are real IPC.
- Shared dictionary import/export buttons are disabled only visually.

Implementation path:
- Re-register Electron global shortcuts when toggle/quick-fix shortcut settings change.
- Route all visible permission actions through typed `requestPermission`/settings-open flows.
- Add shared dictionary import/export IPC only after file format and sync path are implemented.

### STT tab

Swift behavior:
- Provider switch sets up/tears down `WhisperKitProvider`, `GroqSTTProvider`, or `MLXAudioProvider`.
- Groq requires API key validation; WhisperKit and MLX map to local models.
- VAD trims silence before provider transcription.
- Domain glossary is sent to providers when supported.

Electron gap:
- Hidden bridge controls update settings, but visible cards are mostly static.
- Real Groq request path exists, but provider validation/status and visible API key/model changes need direct UI wiring.
- Local providers are sidecar seams and must remain explicit not-tested until commands exist.

Implementation path:
- Make visible provider cards update `sttProviderType` and selected model IDs.
- Surface credential/config validation in provider cards.
- Keep `vadEnabled` and `audioInputChannel` wired to settings and job snapshots.

### LLM tab

Swift behavior:
- Provider switch tears down previous providers and may auto-enable screenshot context for vision providers.
- `NoneProvider` returns raw text.
- Correction mode picks Swift `CorrectionPrompts` by language/mode.
- Enabled correction mappings are appended to the system prompt.
- LLM failures are non-fatal and fall back to raw transcription.

Electron gap:
- Visible provider/model/correction controls are mostly static, with hidden bridge controls doing the actual updates.
- Cloud request prompts are generic placeholders and do not match `CorrectionPrompts.swift`.
- LLM failure currently can fail the whole job.

Implementation path:
- Wire visible LLM provider/model/correction/screenshot controls to settings.
- Port Swift correction prompt text into shared prompt builder.
- Build Groq/OpenAI request system prompts from correction mode, language, mappings, and screenshot availability.
- Change LLM execution failure to raw fallback while preserving error evidence.

### Models / downloads

Swift behavior:
- Model specs, compatibility grades, runtime type, download/load state, and provider capability drive model UI.
- Local text, local vision, Python MLX, and WhisperKit differ by platform and runtime.

Electron gap:
- Model tab is visually mocked; local engine registry exists but has no user-visible action/state store.

Implementation path:
- Add a model inventory/readiness store backed by local engine registry.
- Wire model selection buttons to `whisperModelId`, `mlxAudioModelId`, and `llmModelId`.
- Keep actual download/load as explicit sidecar command contracts until implemented.

### Domain word sets

Swift behavior:
- `DomainWordSetsView` supports add/toggle/delete words and correction mappings using copy-mutate-reassign.
- Default sets are generated from `DomainWordSet.generateDefault(domain:)` with full word lists.
- Quick Fix adds words/mappings into a `Quick Fix` set, creating it if absent.

Electron gap:
- The panel renders default-looking data when settings are empty, but most buttons do nothing.
- Default lists are truncated compared with Swift.

Implementation path:
- Store Swift-faithful default sets in shared helpers.
- Make visible toggles, expand/collapse, add/delete word, add/delete correction, and add default set update `domainWordSets` through IPC.
- Deduplicate words/mappings like Quick Fix.

### History

Swift behavior:
- `AppState.addToHistory()` inserts latest first and caps at 100.
- UI supports Clear All and per-row original/corrected copy.

Electron gap:
- Copy is wired; Clear All button is visual only.
- Pipeline caps in-memory history at 20 instead of Swift's 100.

Implementation path:
- Add `clearHistory` IPC, preload API, main handler, pipeline method, and UI handler.
- Raise Electron history retention to 100 for Swift parity.

### Quick Fix

Swift behavior:
- Captures selected text via Cmd+C while restoring prior clipboard.
- Replaces selection via clipboard + Cmd+V and delayed clipboard restore.
- Adds corrected words/mappings to the `Quick Fix` domain set with duplicate prevention.

Electron gap:
- Quick Fix is currently a visual surface only.

Implementation path:
- Add Quick Fix adapter/service interface for selected-text capture, replacement, and dictionary mutation.
- Implement macOS path using clipboard + command runner; keep Windows path typed/not-tested.
- Reuse domain word set helper to create/update `Quick Fix` set.

### OS adapters: permissions, text, browser, terminal, screen, media

Swift behavior:
- Permission manager handles microphone/accessibility/screen/automation, caches automation grants, and opens system settings deep links.
- Text insertion activates target app, restores clipboard after a delay, and handles image insertion with input source switching.
- Browser context captures Chrome tab ID, URL, active element selector, selection offsets, and can refresh caret while processing.
- Terminal context captures iTerm2 active session UUID, TTY, and tmux session/window/pane, then restores both layers.
- Continuous screenshot capture debounces focus/scroll/click and caps captures.
- Media playback pauses/resumes through layered AppleScript/MediaRemote/media-key strategy.

Electron gap:
- macOS adapters are partial and simpler than Swift.
- Windows adapters are explicit seams but unexecuted.

Implementation path:
- Keep platform classes small and interface-driven.
- Improve macOS context payload shape to include Chrome element/caret and iTerm/tmux fields where feasible.
- Add media playback adapter seam and wire recording start/stop to it.
- Keep Windows implementation explicit and not-tested, not silently equivalent.

## Verification matrix

| Story | Required verification |
| --- | --- |
| G006 map | `git diff --check`; original repo untouched; document committed |
| G007 tabs | renderer tests for visible STT/LLM/WordSets/History actions; settings validation tests; typecheck/lint |
| G008 recording | controller/pipeline unit tests for push-to-talk/toggle, real start/stop, scoped cancel, FIFO gate |
| G009 providers | prompt builder tests against Swift examples; cloud request tests; LLM fallback tests; Windows non-MLX tests |
| G010 adapters | adapter unit tests for permission mapping, hotkey re-register, text fallback, context JSON payloads |
| G011 final | `npm run verify`; `npm run package`; `npm run tabs:capture`; smoke launch; readiness/signing probes; visual evidence; original repo untouched; ai-slop-cleaner; independent review |

## Current known external blockers

- Real Groq/OpenAI calls require runtime credentials and cannot be claimed without executing credentialed requests.
- macOS TCC permissions cannot be silently granted; adapters can request/open settings only.
- Windows runtime, Windows signing, and Windows local AI cannot be claimed from this macOS host; they must remain `not-tested` until executed on Windows.
- Production notarization/signing requires developer credentials and should remain env-gated.
