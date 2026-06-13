# Whispree Swift → Electron UI Parity Task Registry

> Durable tracked copy of `.omx/tasks/ui-parity-registry-20260613.md` for the June 13, 2026 visual parity execution wave plan.

Status: Active
Source repo: `/Users/arsture/ideas/whispree` (read-only)
Target repo: `/Users/arsture/ideas/whispree-electron`
Goal: port SwiftUI visual structure/details into React/CSS mock UI first; behavior wiring remains sequential follow-up unless already typed.
Concurrency rule: max 6 active agents. Each task owns disjoint write scopes. Agents must not edit files outside their scope without reporting blocker.

## Global acceptance for every task
- Read listed Swift source files directly.
- Preserve Swift visual semantics: glass/material, compact macOS spacing, Korean copy, icons, row hierarchy, status tones.
- Keep renderer lightweight and typed; no backend/provider side effects.
- Prefer static/mocked UI state when behavior is not yet sequentially wired.
- Add/adjust tests only inside assigned scope when needed.
- Do not modify `/Users/arsture/ideas/whispree`.

## Tasks

### UI-01 Design tokens and shared primitives
- Swift sources: `Views/Design/DesignTokens.swift`, `SettingsCard.swift`, `SettingsRow.swift`, `StatusBadge.swift`, `CompatibilityBadge.swift`, `ModelMetricsView.swift`, `PermissionRow.swift`.
- Target/write scope: `src/renderer/components/primitives.tsx`, `src/renderer/styles/tokens.css`, `src/renderer/styles/components.css`, optional `src/renderer/App.test.tsx` assertions for shared class contracts.
- Output: CSS variables and reusable React primitives mirroring Swift DesignTokens/LiquidSection/SettingsCard/StatusBadge/MetricLabel/PermissionRow.
- No edit: panel-specific files.

### UI-02 Unified shell, titlebar spacer, sidebar/tab navigation
- Swift sources: `Views/UnifiedView.swift`, `Views/Settings/SettingsView.swift`.
- Target/write scope: `src/renderer/App.tsx`, `src/renderer/components/SidebarShell.tsx`, `src/renderer/ui-model.ts`, `src/renderer/ui-model.test.ts`, `src/renderer/styles/shell.css`.
- Output: Swift-like 220/80 sidebar, 52 titlebar inset, separators, selected row shape/icon block, exact tab order/labels/icons.
- No edit: individual panels.

### UI-03 Home dashboard main content
- Swift sources: `Views/Dashboard/MainDashboardView.swift` except overlay-specific details, plus provider status portions.
- Target/write scope: `src/renderer/panels/HomePanel.tsx`, `src/renderer/styles/home.css`, optional `src/renderer/App.test.tsx` home assertions.
- Output: header/status dot, recording card, accessibility warning mock, last transcription, screenshot strip mock, provider status cards, queue cards.
- No edit: Settings/History/Shell files.

### UI-04 Transcription overlay and waveform mock
- Swift sources: `Views/Transcription/TranscriptionOverlayView.swift`.
- Target/write scope: `src/renderer/panels/TranscriptionOverlayMock.tsx`, `src/renderer/styles/overlay.css`, optional import/use from `HomePanel.tsx` only if coordinated by leader; otherwise export component ready for integration.
- Output: 280px regularMaterial overlay, status row, NeonWaveform central-fold bar pattern, hotkey chips, handoff flash/error/loading states mocked.
- No edit: broad Home layout unless leader-owned integration.

### UI-05 Settings shared layout and General tab
- Swift sources: `Views/Settings/SettingsView.swift`, `GeneralSettingsView.swift`, `ShortcutRecorderButton.swift`, `Views/Design/PermissionRow.swift`.
- Target/write scope: `src/renderer/panels/SettingsPanels.tsx`, `src/renderer/styles/settings.css` sections for shared/general only.
- Output: Swift SettingsCard/SettingsRow hierarchy, shortcut recorder mock popover state surface, permission rows, general toggles, dictionary/browser/terminal sections.
- No edit: STT/LLM/Models/WordSets subsections beyond placeholders unless scoped.

### UI-06 STT settings tab
- Swift sources: `Views/Settings/STTSettingsView.swift`, `Views/Design/ModelMetricsView.swift`.
- Target/write scope: `src/renderer/panels/STTSettingsPanelMock.tsx`, `src/renderer/styles/settings-stt.css` (create + import via `settings.css`), optional integration note only.
- Output: provider rows for WhisperKit/Groq/MLX/local, selected radio-style rows, Groq API key notice, cold start/model status/VAD/audio channel mock.
- No edit: `SettingsPanels.tsx` unless leader later integrates.

### UI-07 LLM settings tab
- Swift sources: `Views/Settings/LLMSettingsView.swift`.
- Target/write scope: `src/renderer/panels/LLMSettingsPanelMock.tsx`, `src/renderer/styles/settings-llm.css` (create + import via `settings.css`), optional integration note only.
- Output: provider selector, local/OpenAI/Groq model cards, screenshot context toggles, OpenAI auth block, correction mode rows, system prompt preview/editor mock.
- No edit: General/STT/Models files.

### UI-08 Downloads / model management tab
- Swift sources: `Views/Settings/ModelSettingsView.swift`, `Views/Design/CompatibilityBadge.swift`, `ModelMetricsView.swift`.
- Target/write scope: `src/renderer/panels/ModelsPanelMock.tsx`, `src/renderer/styles/models.css` (create + import via `settings.css`), optional integration note only.
- Output: device capability cards, model location row, downloadable model rows, metrics, compatibility badges, download/loading/ready/delete mock states.

### UI-09 Domain word sets tab
- Swift sources: `Views/Settings/DomainWordSetsView.swift`.
- Target/write scope: `src/renderer/panels/DomainWordSetsPanelMock.tsx`, `src/renderer/styles/wordsets.css` (create + import via `settings.css`), optional integration note only.
- Output: domain sections, word chips/rows, add/remove/edit mock states, dictionary sync visual parity.

### UI-10 History tab
- Swift sources: `Views/Transcription/TranscriptionHistoryView.swift`.
- Target/write scope: `src/renderer/panels/HistoryPanel.tsx`, `src/renderer/styles/history.css`, optional `src/renderer/App.test.tsx` history assertions.
- Output: Swift empty state, Clear All header, relative timestamp, original/corrected badges/buttons, transcription row typography.

### UI-11 Onboarding shell and steps
- Swift sources: `Views/Onboarding/OnboardingView.swift`.
- Target/write scope: `src/renderer/panels/onboarding/OnboardingMock.tsx`, `src/renderer/styles/onboarding.css`.
- Output: 480x640 card flow, progress bar, Welcome, Permissions, Provider Setup, Recording Guide, Quick Fix/Ready mocked states.

### UI-12 Quick Fix panel
- Swift sources: `Views/QuickFix/QuickFixPanelView.swift`.
- Target/write scope: `src/renderer/panels/quickfix/QuickFixMock.tsx`, `src/renderer/styles/quickfix.css`.
- Output: Quick Fix popover/card, correction/register modes, selected text preview, replacement rows, dictionary registration visual states.

### UI-13 Screenshot selection overlay
- Swift sources: `Views/ScreenshotSelectionView.swift`, screenshot overlay portions of `Dashboard/MainDashboardView.swift`.
- Target/write scope: `src/renderer/panels/ScreenshotSelectionMock.tsx`, `src/renderer/styles/screenshot-selection.css` (create + import from `home.css`), optional integration note only.
- Output: screenshot thumbnail strip, selection overlay, app name/timestamp, selected/unselected states.

### UI-14 Menu bar popover
- Swift sources: `Views/MenuBar/MenuBarView.swift`.
- Target/write scope: `src/renderer/panels/menubar/MenuBarMock.tsx`, `src/renderer/styles/menubar.css`.
- Output: 320px menu bar popover mock, status/audio level, last transcription, controls, settings/quit actions.

### UI-15 Swift source contract extraction/test reinforcement
- Swift sources: all `Views/**/*.swift` above.
- Target/write scope: `scripts/capture-visual-parity.mjs`, `scripts/capture-visual-parity.test.mjs`, `.omx/artifacts/visual-parity/*` only.
- Output: parity contract checklist extended to all UI tasks above, without claiming pixel parity.

### UI-16 Renderer DOM/visual contract tests
- Swift sources: registry references only.
- Target/write scope: `src/renderer/App.test.tsx`, `src/renderer/ui-model.test.ts`, optional new `src/renderer/ui-parity-contract.test.tsx`.
- Output: tests assert tab order, token variables, shell dimensions, key Korean labels, major mock components are present.

### UI-17 CSS responsive/accessibility polish
- Swift sources: Design role hierarchy docs + DesignTokens.
- Target/write scope: `src/renderer/styles/accessibility.css` (create + import from `styles.css`), optional small CSS-only edits in scoped style files after wave integration.
- Output: focus rings, reduced motion, high contrast, Korean font/readability, compact macOS resizing behavior.

### UI-18 Final packaged UI smoke and screenshot artifacts
- Swift sources: parity artifacts only.
- Target/write scope: `scripts/smoke-packaged-app.mjs`, `.omx/artifacts/electron-ui-parity/*`, `.omx/artifacts/packaged-app-smoke/*`.
- Output: package/run screenshot smoke remains green after UI changes.

## Wave assignment plan
- Wave 1: UI-01, UI-02, UI-03, UI-06, UI-10, UI-15.
- Wave 2: UI-04, UI-05, UI-07, UI-08, UI-09, UI-16.
- Wave 3: UI-11, UI-12, UI-13, UI-14, UI-17, UI-18.

Integration policy:
- Agents create isolated components/styles when task would conflict with a currently-owned panel.
- Leader integrates mock components into panels after each wave and runs tests.
