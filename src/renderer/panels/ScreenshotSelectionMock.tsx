import { useMemo, useState } from 'react';

import '../styles/screenshot-selection.css';

type ScreenshotTone = 'blue' | 'purple' | 'green' | 'orange';

type ScreenshotMock = {
  readonly id: string;
  readonly appName: string;
  readonly timestamp: string;
  readonly title: string;
  readonly tone: ScreenshotTone;
  readonly selected: boolean;
};

const screenshotMocks: readonly ScreenshotMock[] = [
  {
    id: 'screen-safari-context',
    appName: 'Safari',
    timestamp: '10:42:18',
    title: 'OpenAI Docs · 이미지 컨텍스트',
    tone: 'blue',
    selected: true,
  },
  {
    id: 'screen-xcode-context',
    appName: 'Xcode',
    timestamp: '10:42:22',
    title: 'WhispreeApp.swift · capture flow',
    tone: 'purple',
    selected: false,
  },
  {
    id: 'screen-terminal-context',
    appName: 'Terminal',
    timestamp: '10:42:26',
    title: 'npm run typecheck',
    tone: 'green',
    selected: true,
  },
  {
    id: 'screen-notes-context',
    appName: 'Notes',
    timestamp: '10:42:31',
    title: '회의 메모 · 화면 맥락',
    tone: 'orange',
    selected: false,
  },
] as const;

const actionHints = [
  { key: '↑↓', label: '이동' },
  { key: 'Space', label: '선택' },
  { key: 'Enter', label: '확인' },
  { key: '⌘Enter', label: '미리보기' },
  { key: 'Esc', label: '건너뛰기' },
] as const;

function ScreenshotArtwork({ screenshot, large = false }: { readonly screenshot: ScreenshotMock; readonly large?: boolean }) {
  return (
    <div className="screenshot-selection-artwork" data-large={large} data-tone={screenshot.tone} aria-hidden="true">
      <span className="screenshot-selection-window-bar" />
      <span className="screenshot-selection-window-line" data-line="1" />
      <span className="screenshot-selection-window-line" data-line="2" />
      <span className="screenshot-selection-window-line" data-line="3" />
      <span className="screenshot-selection-glow" />
    </div>
  );
}

function KeyHint({ hint }: { readonly hint: (typeof actionHints)[number] }) {
  return (
    <span className="screenshot-selection-key-hint">
      <kbd>{hint.key}</kbd>
      <span>{hint.label}</span>
    </span>
  );
}

function SelectionRow({
  screenshot,
  focused,
  selected,
  onToggle,
  onPreview,
}: {
  readonly screenshot: ScreenshotMock;
  readonly focused: boolean;
  readonly selected: boolean;
  readonly onToggle: () => void;
  readonly onPreview: () => void;
}) {
  return (
    <article className="screenshot-selection-row" data-focused={focused} data-selected={selected}>
      <button
        className="screenshot-selection-check"
        type="button"
        aria-label={`${screenshot.appName} ${selected ? '선택 해제' : '선택'}`}
        aria-pressed={selected}
        onClick={onToggle}
      >
        {selected ? '✓' : '○'}
      </button>
      <button className="screenshot-selection-preview-button" type="button" onClick={onPreview}>
        <ScreenshotArtwork screenshot={screenshot} />
        <span className="screenshot-selection-row-copy">
          <strong>{screenshot.appName}</strong>
          <small>{screenshot.timestamp}</small>
          <span>{screenshot.title}</span>
        </span>
      </button>
    </article>
  );
}

function ThumbnailStrip({
  screenshots,
  selectedIds,
  activeId,
  onPreview,
}: {
  readonly screenshots: readonly ScreenshotMock[];
  readonly selectedIds: ReadonlySet<string>;
  readonly activeId: string;
  readonly onPreview: (screenshot: ScreenshotMock) => void;
}) {
  return (
    <section className="screenshot-selection-strip liquid-card" aria-label="스크린 컨텍스트 썸네일 스트립">
      <header className="screenshot-selection-strip-heading">
        <span aria-hidden="true">▣</span>
        <h2>스크린 컨텍스트</h2>
        <small>{screenshots.length}장</small>
      </header>
      <div className="screenshot-selection-thumbnails">
        {screenshots.map((screenshot) => {
          const selected = selectedIds.has(screenshot.id);
          return (
            <button
              className="screenshot-selection-thumbnail"
              data-active={activeId === screenshot.id}
              data-selected={selected}
              data-tone={screenshot.tone}
              key={screenshot.id}
              type="button"
              onClick={() => onPreview(screenshot)}
            >
              <ScreenshotArtwork screenshot={screenshot} />
              <span>{selected ? '✓' : ''}</span>
              <strong>{screenshot.appName}</strong>
              <small>{screenshot.timestamp}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PreviewOverlay({ screenshot, selected }: { readonly screenshot: ScreenshotMock; readonly selected: boolean }) {
  return (
    <section className="screenshot-selection-overlay" aria-label="스크린샷 미리보기 오버레이">
      <div className="screenshot-selection-overlay-scrim" />
      <div className="screenshot-selection-overlay-card" data-selected={selected}>
        <header>
          <span className="screenshot-selection-app-icon" aria-hidden="true">▦</span>
          <strong>{screenshot.appName}</strong>
          <small>{screenshot.timestamp}</small>
          <span className="screenshot-selection-close" aria-hidden="true">×</span>
        </header>
        <ScreenshotArtwork screenshot={screenshot} large />
        <footer>
          <span>{screenshot.title}</span>
          <strong>{selected ? '선택됨' : '미선택'}</strong>
        </footer>
      </div>
    </section>
  );
}

export function ScreenshotSelectionMock() {
  const initialSelectedIds = useMemo(() => screenshotMocks.filter((screenshot) => screenshot.selected).map((screenshot) => screenshot.id), []);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initialSelectedIds);
  const [activeId, setActiveId] = useState(screenshotMocks[0].id);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeScreenshot = screenshotMocks.find((screenshot) => screenshot.id === activeId) ?? screenshotMocks[0];

  function toggleScreenshot(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((current) => (current.length === screenshotMocks.length ? [] : screenshotMocks.map((screenshot) => screenshot.id)));
  }

  function previewScreenshot(screenshot: ScreenshotMock) {
    setActiveId(screenshot.id);
  }

  return (
    <div className="screenshot-selection-mock" data-testid="screenshot-selection-mock">
      <header className="screenshot-selection-mock-header">
        <div>
          <p>Screenshot Selection</p>
          <h1>스크린샷 선택 UI mock</h1>
        </div>
        <span>UI only · selected/unselected states</span>
      </header>

      <div className="screenshot-selection-layout">
        <section className="screenshot-selection-panel liquid-card" aria-label="스크린샷 선택 패널">
          <header className="screenshot-selection-panel-heading">
            <span aria-hidden="true">▧</span>
            <strong>스크린샷 선택</strong>
            <small>{selectedIds.length}/{screenshotMocks.length}</small>
          </header>

          <div className="screenshot-selection-action-list">
            <button className="screenshot-selection-action-row" data-focused="false" type="button">
              <span aria-hidden="true">↪</span>
              <strong>넘어가기</strong>
            </button>
            <button className="screenshot-selection-action-row" data-focused={selectedIds.length === screenshotMocks.length} type="button" onClick={toggleSelectAll}>
              <span aria-hidden="true">{selectedIds.length === screenshotMocks.length ? '✓' : '▦'}</span>
              <strong>모두 선택</strong>
            </button>
          </div>

          <div className="screenshot-selection-divider" />

          <div className="screenshot-selection-list" aria-label="이미지 목록">
            {screenshotMocks.map((screenshot) => (
              <SelectionRow
                focused={activeId === screenshot.id}
                key={screenshot.id}
                onPreview={() => previewScreenshot(screenshot)}
                onToggle={() => toggleScreenshot(screenshot.id)}
                screenshot={screenshot}
                selected={selectedIdSet.has(screenshot.id)}
              />
            ))}
          </div>

          <footer className="screenshot-selection-footer">
            {actionHints.map((hint) => <KeyHint hint={hint} key={`${hint.key}-${hint.label}`} />)}
          </footer>
        </section>

        <div className="screenshot-selection-showcase">
          <ThumbnailStrip screenshots={screenshotMocks} selectedIds={selectedIdSet} activeId={activeId} onPreview={previewScreenshot} />
          <PreviewOverlay screenshot={activeScreenshot} selected={selectedIdSet.has(activeScreenshot.id)} />
        </div>
      </div>
    </div>
  );
}

export default ScreenshotSelectionMock;
