import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { SidecarClient, type JsonLineSidecarTransport } from './sidecar-client';

function fakeTransport(): JsonLineSidecarTransport & { readonly writes: string[] } {
  const writes: string[] = [];
  return {
    events: new EventEmitter(),
    writes,
    writeLine: (line) => writes.push(line),
    dispose: vi.fn(),
  };
}

describe('SidecarClient', () => {
  it('writes JSON-line requests and resolves matching responses', async () => {
    const transport = fakeTransport();
    const client = new SidecarClient(transport, { idFactory: () => 'req-1', timeoutMs: 1000 });
    const promise = client.request({ type: 'health' });

    expect(JSON.parse(transport.writes[0]!)).toMatchObject({ id: 'req-1', protocolVersion: 1, type: 'health' });
    transport.events.emit('line', JSON.stringify({ id: 'req-1', protocolVersion: 1, type: 'health', ok: true, capabilities: ['speech-to-text'] }));

    await expect(promise).resolves.toMatchObject({ type: 'health', ok: true });
  });

  it('rejects malformed JSON and timeouts', async () => {
    vi.useFakeTimers();
    const transport = fakeTransport();
    const client = new SidecarClient(transport, { idFactory: () => 'req-1', timeoutMs: 50 });
    const timeoutPromise = client.request({ type: 'health' });
    const timeoutExpectation = expect(timeoutPromise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(60);
    await timeoutExpectation;
    vi.useRealTimers();

    const malformedTransport = fakeTransport();
    const malformedClient = new SidecarClient(malformedTransport, { idFactory: () => 'req-2', timeoutMs: 1000 });
    const malformedPromise = malformedClient.request({ type: 'health' });
    malformedTransport.events.emit('line', '{nope');
    await expect(malformedPromise).rejects.toThrow('Malformed sidecar JSON');
  });
});
