import { afterEach, describe, expect, it } from 'vitest';
import { buildSidecarEnvironment } from './process-sidecar-transport';

const originals = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  APPLE_ID: process.env.APPLE_ID,
  PATH: process.env.PATH,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originals)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('ProcessSidecarTransport environment', () => {
  it('does not pass unrelated parent secrets to local AI sidecars', () => {
    process.env.OPENAI_API_KEY = 'sk_secret';
    process.env.APPLE_ID = 'apple@example.com';
    process.env.PATH = '/usr/bin';

    const env = buildSidecarEnvironment({ WHISPREE_MODEL_PATH: '/models/qwen.gguf' });

    expect(env.PATH).toBe('/usr/bin');
    expect(env.WHISPREE_MODEL_PATH).toBe('/models/qwen.gguf');
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.APPLE_ID).toBeUndefined();
  });
});
