import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { SIDEBAR_SECTIONS } from './ui-model';

describe('App Swift parity shell markup', () => {
  it('renders a tabbed glass shell with stable DOM contracts', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('data-view="whispree-shell"');
    expect(html).toContain('role="tablist"');
    for (const section of SIDEBAR_SECTIONS) {
      expect(html).toContain(`data-tab="${section.id}"`);
      expect(html).toContain(`data-icon-tone="${section.iconTone}"`);
    }
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('data-panel="home"');
    expect(html).toContain('data-visited="true"');
  });

  it('renders dashboard sections, overlay keycaps, and no migration-scaffold copy', () => {
    const html = renderToStaticMarkup(<App />);

    for (const testId of [
      'recording-status',
      'queue-summary',
      'latest-transcription',
      'providers',
      'permissions',
      'transcription-overlay',
      'overlay-waveform',
      'queue-list',
    ]) {
      expect(html).toContain(`data-testid="${testId}"`);
    }
    expect(html).toContain('data-hotkey="cancel"');
    expect(html).toContain('esc');
    expect(html).toContain('Whispree');
    expect(html).not.toContain('Whispree Electron Migration');
    expect(html).not.toContain('window.whispree');
    expect(html).not.toContain('mock scaffold only');
  });
});
