import '../../styles/quickfix.css';

type QuickFixMode = 'mapping' | 'wordOnly';
type RegistrationState = 'queued' | 'stt' | 'llm' | 'saved';

type ReplacementRow = {
  readonly id: string;
  readonly source: string;
  readonly replacement: string;
  readonly confidence: string;
  readonly selected?: boolean;
  readonly note: string;
};

type DictionaryState = {
  readonly id: RegistrationState;
  readonly label: string;
  readonly detail: string;
  readonly icon: string;
  readonly active?: boolean;
};

const selectedText = '오픈에이아이 위스프리 플러그인';
const correctionPreview = 'OpenAI Whispree 플러그인';

const modes: readonly { readonly id: QuickFixMode; readonly label: string; readonly description: string; readonly selected?: boolean }[] = [
  {
    id: 'wordOnly',
    label: '단어 추가',
    description: 'STT + LLM 사전에 단어 추가',
  },
  {
    id: 'mapping',
    label: '매핑 추가',
    description: 'LLM 교정 매핑 추가 (STT 미적용)',
    selected: true,
  },
];

const replacementRows: readonly ReplacementRow[] = [
  {
    id: 'openai-whispree-plugin',
    source: selectedText,
    replacement: correctionPreview,
    confidence: '추천',
    selected: true,
    note: '현재 선택 텍스트를 LLM 교정 매핑으로 저장',
  },
  {
    id: 'whispree-plugin',
    source: '위스프리 플러그인',
    replacement: 'Whispree 플러그인',
    confidence: '부분 매핑',
    note: '앱 이름만 반복 교정할 때 사용',
  },
  {
    id: 'openai-word',
    source: '오픈에이아이',
    replacement: 'OpenAI',
    confidence: '사전 후보',
    note: 'STT 사전에도 등록 가능한 용어',
  },
];

const dictionaryStates: readonly DictionaryState[] = [
  {
    id: 'queued',
    label: '입력 대기',
    detail: '올바른 단어를 입력하면 저장 버튼이 활성화됩니다',
    icon: '…',
  },
  {
    id: 'stt',
    label: 'STT 사전',
    detail: '단어 추가 모드에서 음성 인식 힌트로 등록',
    icon: 'mic',
  },
  {
    id: 'llm',
    label: 'LLM 교정 매핑',
    detail: '“오픈에이아이 위스프리 플러그인” → “OpenAI Whispree 플러그인”',
    icon: '↳',
    active: true,
  },
  {
    id: 'saved',
    label: '저장 후 교정',
    detail: '현재 텍스트에 즉시 치환을 적용하는 완료 상태',
    icon: '✓',
    active: true,
  },
];

function ModePicker() {
  return (
    <div className="quickfix-mode-block">
      <div className="quickfix-segmented" role="radiogroup" aria-label="Quick Fix mode mock selector">
        {modes.map((mode) => (
          <div className="quickfix-segment" data-selected={mode.selected === true} role="radio" aria-checked={mode.selected === true} tabIndex={0} key={mode.id}>
            {mode.label}
          </div>
        ))}
      </div>
      <p>{modes.find((mode) => mode.selected)?.description}</p>
    </div>
  );
}

function TextPreviewSection() {
  return (
    <section className="quickfix-section quickfix-text-preview" aria-label="선택된 텍스트">
      <span className="quickfix-section-label">선택된 텍스트</span>
      <p>{selectedText}</p>
      <div className="quickfix-selection-meta" aria-label="selected text metadata">
        <span>textSelection enabled</span>
        <span>원문 보존</span>
      </div>
    </section>
  );
}

function CorrectionInputSection() {
  return (
    <section className="quickfix-section quickfix-input-section" aria-label="교정할 단어">
      <span className="quickfix-section-label">교정할 단어</span>
      <div className="quickfix-text-field" aria-label="올바른 단어를 입력하세요">
        <span>{correctionPreview}</span>
        <i aria-hidden="true" />
      </div>
    </section>
  );
}

function ReplacementRows() {
  return (
    <section className="quickfix-section" aria-label="replacement rows">
      <div className="quickfix-section-heading">
        <span className="quickfix-section-label">저장될 매핑</span>
        <span className="quickfix-pill">arrow.right</span>
      </div>
      <div className="quickfix-replacement-list">
        {replacementRows.map((row) => (
          <article className="quickfix-replacement-row" data-selected={row.selected === true} key={row.id}>
            <div className="quickfix-replacement-flow">
              <code>“{row.source}”</code>
              <span aria-hidden="true">→</span>
              <strong>“{row.replacement}”</strong>
            </div>
            <div className="quickfix-row-meta">
              <span>{row.confidence}</span>
              <small>{row.note}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DictionaryRegistrationStates() {
  return (
    <section className="quickfix-section" aria-label="dictionary registration visual states">
      <div className="quickfix-section-heading">
        <span className="quickfix-section-label">사전 등록 상태</span>
        <span className="quickfix-pill quickfix-pill-accent">UI only</span>
      </div>
      <div className="quickfix-dictionary-grid">
        {dictionaryStates.map((state) => (
          <div className="quickfix-dictionary-state" data-state={state.id} data-active={state.active === true} key={state.id}>
            <span className="quickfix-dictionary-icon" aria-hidden="true">{state.icon}</span>
            <div>
              <strong>{state.label}</strong>
              <small>{state.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterActions() {
  return (
    <footer className="quickfix-footer">
      <span>LLM 교정 매핑으로 저장</span>
      <div className="quickfix-actions">
        <button type="button" className="quickfix-button">취소</button>
        <button type="button" className="quickfix-button quickfix-button-primary">저장 및 교정</button>
      </div>
    </footer>
  );
}

export function QuickFixMock() {
  return (
    <div className="quickfix-mock" data-testid="quickfix-mock">
      <section className="quickfix-popover" aria-label="Quick Fix popover card">
        <header className="quickfix-header">
          <span className="quickfix-header-icon" aria-hidden="true">▤</span>
          <h1>Quick Fix</h1>
          <span className="quickfix-header-spacer" />
          <span className="quickfix-window-chip">440px popover</span>
        </header>

        <div className="quickfix-divider" />
        <ModePicker />
        <TextPreviewSection />
        <CorrectionInputSection />
        <ReplacementRows />
        <DictionaryRegistrationStates />
        <div className="quickfix-divider" />
        <FooterActions />
      </section>

      <aside className="quickfix-register-card" aria-label="단어 추가 모드 preview">
        <span className="quickfix-section-label">단어 추가 모드</span>
        <strong>Whispree</strong>
        <p>STT + LLM 사전에 저장되는 단일 단어 등록 화면. 매핑 행 없이 사전 배지만 활성화됩니다.</p>
        <div className="quickfix-register-badges">
          <span data-tone="success">STT dictionary</span>
          <span data-tone="accent">LLM dictionary</span>
        </div>
      </aside>
    </div>
  );
}

export default QuickFixMock;
