# Electron UI Parity Baseline

This document anchors the Electron renderer's current visual direction to the copied SwiftUI Whispree reference. It is a parity baseline, not a pixel-perfect claim.

## Current milestone scope

Implemented scope:

- Swift-style left sidebar/tab shell with seven sections.
- Glass/liquid neutral surfaces using CSS material approximations.
- Home dashboard hierarchy: Whispree header, compact recording card, queue counts, latest transcription, provider/permission rows.
- Compact transcription overlay preview with waveform and keycap badges.
- Planned settings/model/word/history placeholders grounded in Swift source labels.

Deferred scope:

- Legacy Swift side-by-side screenshot/pixel verdict.
- Native macOS material identity beyond CSS `backdrop-filter` approximation.
- Real audio, hotkey, text insertion, screenshot, browser/terminal context, cloud AI, local AI sidecars, CI/CD, signing, and Windows runtime validation.

## Swift source anchors

| Swift source | Electron parity mapping |
| --- | --- |
| `Whispree/Views/UnifiedView.swift` sections Home, 일반, STT, LLM, Downloads, 단어 사전, 기록 | `src/renderer/ui-model.ts` `SIDEBAR_SECTIONS` and `button[role="tab"]` order. |
| `UnifiedView.sidebarWidth` 220/80 | CSS variables `--sidebar-expanded: 220px`, `--sidebar-collapsed: 80px`; shell state `data-sidebar-collapsed`. |
| Detail top padding 52 | CSS variable `--titlebar-inset: 52px`; `.titlebar-spacer`. |
| Selected rounded sidebar rows + icon badges | `.sidebar-tab[data-selected="true"]`, `.sidebar-icon[data-icon-tone]`. |
| `DesignTokens` outer padding/card radius/material roles | `src/renderer/styles.css` token block: outer padding 24px, card radius 18px, overlay 280px/14px, neutral material surfaces. |
| `MainDashboardView` header/recording/provider hierarchy | `HomePanel`, `RecordingStatus`, `QueueSummary`, `ProviderRows`, `PermissionRows`. |
| `TranscriptionOverlayView` 280px compact overlay with hotkey badges | `TranscriptionOverlay` and CSS `--overlay-width: 280px`. |
| `GeneralSettingsView`, `STTSettingsView`, `LLMSettingsView`, `ModelSettingsView`, `DomainWordSetsView`, `TranscriptionHistoryView` row labels | `SETTINGS_PLACEHOLDERS` and `HistoryPanel` preserve visible row anchors while behavior stays planned. |

## Verification anchors

- `src/renderer/ui-model.test.ts` validates section order, icon tones, concrete sizing contract, status priority, cancel labels, and settings placeholder anchors.
- `src/renderer/App.test.tsx` validates shell DOM contracts, dashboard sections, overlay keycaps, and removal of migration-scaffold copy.
- `src/tooling/ui-css-contract.test.ts` validates CSS token values and `backdrop-filter` presence.
- `.omx/artifacts/electron-ui-parity/electron-ui-parity.png` is the current Electron screenshot evidence for qualitative comparison against the Swift anchors above.

## Visual claim boundary

The current renderer is structurally and stylistically aligned with the Swift reference. It is not yet pixel-perfect. A future visual-verdict loop should run the legacy Swift app and Electron app side by side, capture both, and compare spacing, material intensity, text density, icon fidelity, and tab transition behavior.

## Review-cycle safeguards

The screenshot evidence hook is intentionally a test harness, not product functionality:

- It only runs for unpackaged, non-production Electron sessions.
- It only writes `.png` files under `.omx/artifacts/electron-ui-parity/`.
- It quits in a `finally` path after capture/write attempts so smoke runs do not hang.

The renderer shell also treats the tab UI as an accessibility contract:

- All tab panels exist in the DOM so `aria-controls` references stay valid.
- Tabs use roving `tabIndex` plus arrow/Home/End navigation.
- Interaction tests cover tab selection, collapse preservation, command wiring, snapshot update, and unsubscribe cleanup.

Architecture watch: `src/renderer/App.tsx` is allowed to remain a compact local-component shell for this visual parity milestone. Before implementing real settings/history/provider behavior, split Home, settings placeholders, history, and shared visual primitives into separate renderer modules.
