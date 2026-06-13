import { useMemo, useState } from 'react';
import { HotkeyBadge, Keycap, PermissionRow, StatusBadge } from '../../components/primitives';

type OnboardingStepId = 'welcome' | 'permissions' | 'providers' | 'recording' | 'ready';

type ProviderState = 'optional' | 'connected' | 'logging-in';

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'complete';

const steps: ReadonlyArray<{ readonly id: OnboardingStepId; readonly label: string }> = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'providers', label: 'Provider Setup' },
  { id: 'recording', label: 'Recording Guide' },
  { id: 'ready', label: 'Quick Fix / Ready' },
];

const demoTranscript = '오늘 회의에서는 밸리데이션 흐름을 정리하고 컨트롤러 로직을 리팩토링합니다.';

export function OnboardingMock() {
  const [stepIndex, setStepIndex] = useState(0);
  const [providerState, setProviderState] = useState<ProviderState>('connected');
  const [recordingState, setRecordingState] = useState<RecordingState>('complete');
  const [selectedMode, setSelectedMode] = useState<'pushToTalk' | 'toggle'>('pushToTalk');

  const currentStep = steps[stepIndex];
  const canGoBack = stepIndex > 0;
  const isFinalStep = stepIndex === steps.length - 1;

  function goToPreviousStep() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goToNextStep() {
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  function cycleProviderState() {
    setProviderState((current) => (current === 'connected' ? 'logging-in' : current === 'logging-in' ? 'optional' : 'connected'));
  }

  function cycleRecordingState() {
    setRecordingState((current) => {
      if (current === 'complete') return 'idle';
      if (current === 'idle') return 'recording';
      if (current === 'recording') return 'transcribing';
      return 'complete';
    });
  }

  const stepContent = useMemo(() => {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep onStart={goToNextStep} />;
      case 'permissions':
        return <PermissionsStep />;
      case 'providers':
        return <ProviderSetupStep providerState={providerState} onCycleProviderState={cycleProviderState} />;
      case 'recording':
        return (
          <RecordingGuideStep
            recordingState={recordingState}
            selectedMode={selectedMode}
            onCycleRecordingState={cycleRecordingState}
            onSelectMode={setSelectedMode}
          />
        );
      case 'ready':
        return <QuickFixReadyStep />;
      default:
        return null;
    }
  }, [currentStep.id, providerState, recordingState, selectedMode]);

  return (
    <section className="onboarding-mock liquid-surface" data-testid="onboarding-mock" data-surface-role="overlay" aria-label="Whispree onboarding mock">
      <ProgressIndicator currentStepIndex={stepIndex} />
      <div className="onboarding-step" data-step={currentStep.id}>
        {stepContent}
      </div>
      {currentStep.id === 'welcome' ? null : (
        <footer className="onboarding-nav">
          <button type="button" className="onboarding-button" onClick={goToPreviousStep} disabled={!canGoBack}>
            Back
          </button>
          <span className="onboarding-step-label">{currentStep.label}</span>
          <button type="button" className="onboarding-button onboarding-button-primary" onClick={isFinalStep ? undefined : goToNextStep}>
            {isFinalStep ? '시작하기' : 'Continue'}
          </button>
        </footer>
      )}
    </section>
  );
}

function ProgressIndicator({ currentStepIndex }: { readonly currentStepIndex: number }) {
  return (
    <ol className="onboarding-progress" aria-label="Onboarding progress">
      {steps.map((step, index) => (
        <li key={step.id} aria-current={index === currentStepIndex ? 'step' : undefined}>
          <span className="onboarding-progress-bar" data-filled={index <= currentStepIndex} />
          <span className="sr-only">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function WelcomeStep({ onStart }: { readonly onStart: () => void }) {
  return (
    <div className="onboarding-centered onboarding-welcome">
      <div className="onboarding-hero-icon" aria-hidden="true">◉</div>
      <h1>Welcome to Whispree</h1>
      <p>Free, local speech-to-text with AI correction.<br />No cloud. No subscription. Just your voice.</p>
      <button type="button" className="onboarding-button onboarding-button-primary onboarding-start" onClick={onStart}>
        Get Started
      </button>
    </div>
  );
}

function PermissionsStep() {
  return (
    <div className="onboarding-column onboarding-permissions">
      <header className="onboarding-step-header">
        <span className="onboarding-step-icon onboarding-warning" aria-hidden="true">⌘</span>
        <h2>Permissions</h2>
        <p>각 항목을 클릭하여 권한을 허용하세요.</p>
      </header>

      <div className="onboarding-card onboarding-permission-list">
        <PermissionRow icon="🎙" title="마이크" subtitle="음성 녹음에 필요합니다" status="granted" />
        <div className="onboarding-divider" />
        <PermissionRow icon="✋" title="손쉬운 사용" subtitle="다른 앱에 텍스트를 붙여넣기 위해 필요합니다" status="notDetermined" />
        <div className="onboarding-divider" />
        <PermissionRow icon="▣" title="화면 녹화" subtitle="다른 앱 화면을 캡처하여 AI 교정의 맥락을 제공합니다" status="denied" />
        <div className="onboarding-divider" />
        <PermissionRow icon="↻" title="앱 관리" subtitle="자동 업데이트에 필요합니다 (선택)" status="notDetermined" actionLabel="설정 열기" />

        <section className="onboarding-automation" aria-label="Automation optional permissions">
          <h3>Automation (선택)</h3>
          <PermissionRow icon="⌘" title="Terminal" subtitle="명령어 맥락 캡처 및 복원" status="granted" />
          <div className="onboarding-divider" />
          <PermissionRow icon="◎" title="Browser" subtitle="현재 브라우저 맥락을 교정에 활용" status="notDetermined" />
        </section>
      </div>
    </div>
  );
}

function ProviderSetupStep({ providerState, onCycleProviderState }: { readonly providerState: ProviderState; readonly onCycleProviderState: () => void }) {
  const openAiCopy = providerState === 'connected' ? '로그인됨' : providerState === 'logging-in' ? '브라우저에서 로그인 중...' : '선택사항';
  const groqStatus = providerState === 'connected' ? 'success' : 'neutral';
  const openAiStatus = providerState === 'logging-in' ? 'warning' : providerState === 'connected' ? 'success' : 'neutral';

  return (
    <div className="onboarding-centered onboarding-provider">
      <span className="onboarding-step-icon" aria-hidden="true">◆</span>
      <h2>서비스 연동</h2>
      <p>사용할 서비스의 인증을 설정하세요.<br />나중에 Settings에서도 변경할 수 있습니다.</p>

      <div className="onboarding-card onboarding-provider-card">
        <ProviderRow
          icon="⚡"
          title="Groq Cloud STT"
          description="빠른 클라우드 음성 인식을 사용하려면 API Key를 입력하세요"
          status={<StatusBadge style={groqStatus}>{providerState === 'connected' ? '연결됨' : '선택사항'}</StatusBadge>}
        >
          <div className="onboarding-secret-field" aria-label="Mock Groq API Key">••••••••••••••••••••••••••••</div>
        </ProviderRow>
        <div className="onboarding-divider" />
        <ProviderRow
          icon="✦"
          title="OpenAI LLM 교정"
          description="GPT로 전사 결과를 교정하려면 로그인하세요"
          status={<StatusBadge style={openAiStatus}>{openAiCopy}</StatusBadge>}
        >
          <button type="button" className="onboarding-login-button" onClick={onCycleProviderState}>
            🌐 OpenAI 로그인 상태 전환
          </button>
        </ProviderRow>
      </div>
    </div>
  );
}

function ProviderRow({
  icon,
  title,
  description,
  status,
  children,
}: {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly status: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="onboarding-provider-row">
      <div className="onboarding-provider-title-row">
        <span className="onboarding-provider-icon" aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
        <div className="onboarding-provider-status">{status}</div>
      </div>
      <p>{description}</p>
      {children}
    </section>
  );
}

function RecordingGuideStep({
  recordingState,
  selectedMode,
  onCycleRecordingState,
  onSelectMode,
}: {
  readonly recordingState: RecordingState;
  readonly selectedMode: 'pushToTalk' | 'toggle';
  readonly onCycleRecordingState: () => void;
  readonly onSelectMode: (mode: 'pushToTalk' | 'toggle') => void;
}) {
  return (
    <div className="onboarding-column onboarding-recording">
      <header className="onboarding-step-header">
        <span className="onboarding-step-icon" aria-hidden="true">▥</span>
        <h2>녹음 방법</h2>
        <p>녹음 모드를 선택하고 테스트해보세요</p>
      </header>

      <div className="onboarding-card onboarding-mode-list">
        <ModeRow
          icon="☝"
          title="Push to Talk"
          description="키를 누르고 있는 동안 녹음, 떼면 전사"
          selected={selectedMode === 'pushToTalk'}
          onSelect={() => onSelectMode('pushToTalk')}
        />
        <div className="onboarding-divider" />
        <ModeRow
          icon="⏻"
          title="Toggle"
          description="한 번 눌러 시작, 다시 눌러 중지"
          selected={selectedMode === 'toggle'}
          onSelect={() => onSelectMode('toggle')}
        />
      </div>

      <RecordingTestSection recordingState={recordingState} onCycleRecordingState={onCycleRecordingState} />
    </div>
  );
}

function ModeRow({
  icon,
  title,
  description,
  selected,
  onSelect,
}: {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button type="button" className="onboarding-mode-row" data-selected={selected} onClick={onSelect}>
      <span className="onboarding-mode-icon" aria-hidden="true">{icon}</span>
      <span className="onboarding-mode-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="onboarding-mode-check" aria-hidden="true">{selected ? '●' : '○'}</span>
    </button>
  );
}

function RecordingTestSection({ recordingState, onCycleRecordingState }: { readonly recordingState: RecordingState; readonly onCycleRecordingState: () => void }) {
  return (
    <section className="onboarding-card onboarding-recording-test" data-recording-state={recordingState}>
      <div className="onboarding-test-header">
        <RecordingStatus recordingState={recordingState} />
        <HotkeyBadge id="toggle-recording" label="녹음" keys="⌥ Space" active={recordingState === 'recording'} />
      </div>
      <button type="button" className="onboarding-text-editor" onClick={onCycleRecordingState}>
        {recordingState === 'idle' ? <span className="onboarding-placeholder">여기에 전사 결과가 나타납니다</span> : demoTranscript}
      </button>
      <div className="onboarding-escape-row"><Keycap>ESC</Keycap><span>녹음 중 취소</span></div>
    </section>
  );
}

function RecordingStatus({ recordingState }: { readonly recordingState: RecordingState }) {
  if (recordingState === 'recording') {
    return <span className="onboarding-recording-status" data-tone="danger"><span />녹음 중...</span>;
  }

  if (recordingState === 'transcribing') {
    return <span className="onboarding-recording-status" data-tone="neutral"><span />전사 중...</span>;
  }

  if (recordingState === 'complete') {
    return <span className="onboarding-recording-status" data-tone="success">✓ 전사 완료!</span>;
  }

  return <span className="onboarding-recording-status" data-tone="neutral">단축키를 눌러 테스트해보세요</span>;
}

function QuickFixReadyStep() {
  return (
    <div className="onboarding-column onboarding-ready">
      <header className="onboarding-step-header">
        <span className="onboarding-step-icon onboarding-warning" aria-hidden="true">▤</span>
        <h2>Quick Fix</h2>
        <p>잘못 전사된 단어를 바로 교정하고<br />사전에 등록하세요</p>
      </header>

      <div className="onboarding-card onboarding-quickfix-steps">
        <QuickFixStepRow number={1} text="교정할 텍스트를 드래그하여 선택" />
        <QuickFixStepRow number={2} text="⌘⇧F를 눌러 Quick Fix 호출" />
        <QuickFixStepRow number={3} text="올바른 단어를 입력하고 저장" />
        <QuickFixStepRow number={4} text="사전에 등록 → 다음부터 자동 교정" />
      </div>

      <section className="onboarding-card onboarding-quickfix-test">
        <div className="onboarding-test-header">
          <span>아래에서 단어를 선택하고 테스트해보세요</span>
          <Keycap>⌘⇧F</Keycap>
        </div>
        <div className="onboarding-text-editor" role="textbox" aria-label="Quick Fix demo text">
          <span>밸리데이션</span>을 체크해서 컨트롤러의 로직을 리팩토링합니다
        </div>
        <div className="onboarding-ready-state">
          <StatusBadge style="success">Ready</StatusBadge>
          <span>대시보드에서 바로 녹음을 시작할 수 있습니다.</span>
        </div>
      </section>
    </div>
  );
}

function QuickFixStepRow({ number, text }: { readonly number: number; readonly text: string }) {
  return (
    <div className="onboarding-quickfix-row">
      <span>{number}</span>
      <p>{text}</p>
    </div>
  );
}

export default OnboardingMock;
