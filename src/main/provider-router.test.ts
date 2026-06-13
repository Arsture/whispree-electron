import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { defaultAppSettings, type AppSettingsSnapshot } from '../shared/settings';
import { SidecarClient, type JsonLineSidecarTransport } from './local-ai/sidecar-client';
import { SettingsProviderRouter } from './provider-router';

const credentialBoundary = { getSecret: async () => null };
const settings = (override: Partial<AppSettingsSnapshot> = {}) => ({ ...defaultAppSettings, ...override });

function respondingClient(responseFor: (request: Record<string, unknown>) => Record<string, unknown>): SidecarClient {
  const events = new EventEmitter();
  const transport: JsonLineSidecarTransport = {
    events,
    writeLine: (line) => {
      const request = JSON.parse(line) as Record<string, unknown>;
      queueMicrotask(() => events.emit('line', JSON.stringify({ id: request.id, protocolVersion: 1, ...responseFor(request) })));
    },
    dispose: vi.fn(),
  };
  return new SidecarClient(transport, { timeoutMs: 1000 });
}

describe('SettingsProviderRouter', () => {
  it('selects real Groq providers only when settings choose Groq', () => {
    const router = new SettingsProviderRouter(() => settings({ sttProviderType: 'groq', llmProviderType: 'groq' }), credentialBoundary);

    expect(router.sttProvider().descriptor.id).toBe('groq-stt-runtime');
    expect(router.llmProvider().descriptor.id).toBe('groq-llm-runtime');
  });

  it('routes Windows local providers to non-MLX sidecar engines', async () => {
    const router = new SettingsProviderRouter(
      () => settings({ sttProviderType: 'local', llmProviderType: 'local' }),
      credentialBoundary,
      undefined,
      {
        platform: 'win32',
        clientFactory: () => respondingClient((request) => request.type === 'transcribe'
          ? { type: 'transcription', text: 'windows transcript' }
          : { type: 'correction', originalText: String(request.text), correctedText: `fixed ${String(request.text)}` }),
      },
    );

    const stt = router.sttProvider();
    const llm = router.llmProvider();
    expect(stt.descriptor.id).toContain('windows-whisper-cpp');
    expect(llm.descriptor.id).toContain('windows-llama-cpp');
    await expect(stt.transcribe({ jobId: '1', sequence: 1, language: 'ko', glossary: [], audioRef: { kind: 'memory', value: 'x' } })).resolves.toMatchObject({ text: 'windows transcript' });
    await expect(llm.correct({ jobId: '1', sequence: 1, text: 'hello', mode: 'standard', glossary: [], screenshotRefs: [], systemPrompt: 'Swift prompt' })).resolves.toMatchObject({ correctedText: 'fixed hello' });
  });

  it('fails specifically when a selected local sidecar lacks a runnable command', async () => {
    const router = new SettingsProviderRouter(() => settings({ sttProviderType: 'local' }), credentialBoundary, undefined, { platform: 'win32', env: {} as NodeJS.ProcessEnv });

    await expect(router.sttProvider().transcribe({ jobId: '1', sequence: 1, language: 'ko', glossary: [], audioRef: { kind: 'memory', value: 'x' } })).rejects.toThrow(/sidecar|spawn/u);
  });
});
