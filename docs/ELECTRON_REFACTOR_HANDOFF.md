# Whispree Electron Refactor Handoff

## 목적

이 저장소는 기존 macOS SwiftUI 앱 `Whispree`를 보존하면서, Windows 지원을 목표로 **Codex Desktop 스타일의 Electron 기반 앱으로 재구성/재작성**하기 위한 독립 작업 공간이다.

- 원본 저장소: `/Users/arsture/ideas/whispree`
- 새 작업 저장소: `/Users/arsture/ideas/whispree-electron`
- 현재 브랜치: `dev`
- 원본 기준 커밋: `832ec4d3c4ad81a1facaaaa8d52662b8317ba6ac` (`Merge dev into main for caret restore and DiffusionGemma`)

## 현재 상태

- 원본 `whispree`를 `.git` 제외 복사했다.
- 새 저장소에서 `git init` 후 초기 커밋을 만들었다.
- Electron/Vite/React/Node 설정 파일은 **아직 추가하지 않았다**.
- 기존 SwiftUI/Xcode 프로젝트 파일은 참고 자료로 그대로 남아 있다.

초기 커밋:

```text
ab0b8b3 Create isolated Electron refactor workspace
```

## 중요한 작업 원칙

1. `/Users/arsture/ideas/whispree` 원본은 수정하지 않는다.
2. Electron 전환 작업은 `/Users/arsture/ideas/whispree-electron`에서만 진행한다.
3. 기존 SwiftUI 코드를 직접 “포팅”한다고 보기보다, 기능/아키텍처/UX를 참고해 Electron 앱으로 재구현한다.
4. Codex Desktop처럼 **UI는 얇게**, 무거운 작업은 main process / worker / sidecar / native module 쪽으로 분리한다.
5. Claude Desktop처럼 “웹앱 전체를 무겁게 감싼 형태”가 되지 않도록 초기 아키텍처에서 성능 경계를 명확히 잡는다.

## 배경 조사 요약

로컬 설치 앱 기준으로 확인한 내용:

### Claude Desktop

- Electron 기반
- `app.asar`, `Electron Framework.framework` 존재
- package metadata 기준:
  - `electron: 41.6.1`
  - `react: ^18.3.1`
  - `vite: 6.4.2`
  - `@electron-forge/*`

### Codex Desktop

- Electron 기반
- `app.asar` 존재
- package metadata 기준:
  - `name: openai-codex-electron`
  - `electron: 42.1.0`
  - `vite: 8.0.3`
  - `@electron-forge/*`
  - `better-sqlite3`, `node-pty` 등 로컬/터미널 중심 네이티브 모듈 사용

해석: Codex가 더 빠릿한 이유는 Electron 자체가 아니라, 앱 목적을 좁히고 무거운 처리를 UI 밖으로 분리한 구조와 렌더링 최적화 가능성이 크다.

## 추천 기술 방향

첫 구현 방향은 다음을 우선 검토한다.

- Desktop shell: Electron + Electron Forge + Vite
- Renderer: React + TypeScript
- Styling: CSS/Tailwind 중 택1. 기존 SwiftUI 디자인 토큰을 먼저 추출한 뒤 결정
- Main process: 권한, tray/menu, global shortcut, native bridge, sidecar lifecycle 담당
- Worker/sidecar:
  - STT/LLM/local model 작업
  - audio capture/processing 중 Node/Electron으로 어렵거나 OS별 차이가 큰 부분
  - 필요 시 Rust/Swift/Windows native helper를 별도 프로세스로 분리
- Local storage: SQLite 계열 검토. Codex는 `better-sqlite3` 사용 흔적이 있음

주의: 이 문서는 방향 제안만 한다. 실제 `package.json`, Electron 설정, Vite 설정은 다음 세션에서 설계 후 추가한다.

## 기존 SwiftUI 기능 맵

현재 SwiftUI 앱의 주요 기능:

1. Menu bar app / tray UX
2. Global hotkey 기반 녹음 시작/종료
3. AudioService 녹음 + 16kHz mono 변환 + waveform FFT
4. DictationQueue FIFO delivery
5. STT providers
   - WhisperKit local
   - Groq cloud
   - mlx-audio Python worker
6. LLM correction providers
   - None
   - LocalText MLX
   - LocalVision MLX VLM
   - OpenAI Responses API / Codex auth reuse
7. Screenshot capture + VLM context correction
8. Browser/terminal context capture and restore
9. Text insertion via clipboard + accessibility events
10. Quick Fix: selected text correction + dictionary registration
11. Settings persistence
12. Model compatibility / local model management
13. Sparkle auto-update / release workflow

## Electron 재구성 시 먼저 나눌 경계

### 1. Cross-platform core로 바로 옮길 수 있는 것

- settings schema
- dictation queue state machine
- provider abstraction
- prompt templates
- word-edit-distance safety logic
- transcription history model
- domain dictionary model
- cloud API providers: Groq, OpenAI

### 2. OS별 adapter가 필요한 것

- audio capture
- global hotkey
- text insertion / active app restore
- screen capture
- browser context capture
- terminal context capture
- tray/menu behavior
- permissions UX
- updater/release pipeline

### 3. macOS 전용으로 남거나 재설계가 필요한 것

- WhisperKit/CoreML/ANE 경로
- MLX Swift 경로
- AppleScript 기반 Chrome/iTerm2 제어
- Accessibility / Screen Recording 권한 모델
- Sparkle updater
- macOS entitlements/signing

## 다음 Codex 세션 권장 시작 순서

새 Codex 세션은 아래 폴더에서 시작한다.

```bash
cd /Users/arsture/ideas/whispree-electron
```

권장 작업 순서:

1. `AGENTS.md`, `CLAUDE.md`, 하위 `AGENTS.md`를 읽고 기존 아키텍처를 파악한다.
2. 구현 전에 짧은 마이그레이션 계획을 만든다.
3. 기존 Swift 기능을 다음 모듈로 분류한다.
   - renderer UI
   - electron main process
   - preload bridge
   - shared core
   - OS adapter
   - sidecar/worker
4. 그 다음에만 Electron 스캐폴드 추가 여부를 결정한다.
5. 초기 PR/커밋은 “작동하는 빈 shell + 구조”까지만 작게 끊는다.
6. 이후 기능은 아래 순서로 이식한다.
   - tray/menu + settings shell
   - global hotkey + recording state mock
   - audio capture adapter
   - cloud STT/Groq path
   - text insertion adapter
   - queue/FIFO delivery
   - OpenAI correction
   - local model/MLX/WhisperKit 대체 전략
   - screenshot/browser/terminal context

## 다음 세션에서 피해야 할 것

- 원본 SwiftUI 파일을 무리하게 JS/TS로 1:1 변환하지 말 것.
- 초기에 모든 기능을 한 번에 Electron으로 옮기지 말 것.
- renderer에서 STT/LLM/audio 같은 무거운 작업을 직접 처리하지 말 것.
- Windows 지원을 목표로 하면서 macOS-only API를 core에 섞지 말 것.
- Electron을 단순 WebView wrapper처럼 쓰지 말 것.

## 성공 기준 초안

1단계 성공 기준:

- Electron 앱이 macOS와 Windows에서 동일한 기본 shell로 실행된다.
- tray/menu와 main window가 뜬다.
- renderer/main/preload/shared 경계가 명확하다.
- 기존 SwiftUI 기능 목록이 migration backlog로 정리되어 있다.
- SwiftUI 원본 앱은 건드리지 않는다.

2단계 성공 기준:

- hotkey로 recording state가 토글된다.
- mock transcription job이 FIFO queue를 거쳐 UI에 표시된다.
- cloud STT/Groq 또는 OpenAI correction 중 하나가 end-to-end로 연결된다.

3단계 성공 기준:

- 실제 audio capture + STT + correction + target app insertion이 macOS에서 동작한다.
- Windows adapter 설계가 막히지 않도록 OS-specific interface가 분리되어 있다.

## 검증 메모

현재 세션에서 수행한 검증:

```bash
cd /Users/arsture/ideas/whispree-electron
git status --short --branch
```

결과: `dev` 브랜치, 추가 Electron 설정 없음.

