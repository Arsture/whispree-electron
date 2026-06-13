#!/usr/bin/env python3
import json, plistlib, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone

DEFAULT_SETTINGS = {
  "schemaVersion": 1,
  "recordingMode": "push-to-talk",
  "language": "ko",
  "sttProviderType": "whisperkit",
  "llmProviderType": "none",
  "llmEnabled": True,
  "hasCompletedOnboarding": False,
  "launchAtLogin": False,
  "showOverlay": True,
  "correctionMode": "standard",
  "customLLMPrompt": None,
  "whisperModelId": "openai_whisper-large-v3_turbo",
  "llmModelId": "mlx-community/Qwen3-4B-Instruct-2507-4bit",
  "mlxAudioModelId": "mlx-community/Qwen3-ASR-1.7B-8bit",
  "openaiModel": "gpt-5.5",
  "groqLLMModel": "qwen/qwen3-32b",
  "screenshotContextEnabled": False,
  "screenshotPasteEnabled": False,
  "audioInputChannel": 0,
  "vadEnabled": True,
  "pauseMediaDuringRecording": True,
  "restoreBrowserTab": True,
  "restoreTerminalContext": True,
  "domainWordSets": [],
  "correctionMappings": [],
  "sharedDictionaryEnabled": False,
  "sharedDictionaryPath": None,
  "toggleRecordingShortcut": {"kind": "combo", "keyCode": 15, "modifiersRaw": 393216, "label": "⌃⇧R"},
  "quickFixShortcut": {"kind": "combo", "keyCode": 2, "modifiersRaw": 393216, "label": "⌃⇧D"},
}

def main():
    user_data = Path(sys.argv[1])
    try:
        p = subprocess.run(['/usr/bin/defaults','export','com.whispree.app','-'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        d = plistlib.loads(p.stdout)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        return 0
    user_data.mkdir(parents=True, exist_ok=True)
    settings = dict(DEFAULT_SETTINGS)
    settings.update({
      "recordingMode": map_recording(d.get('whispree.recordingMode')),
      "sttProviderType": map_stt(d.get('whispree.sttProviderType')),
      "llmProviderType": map_llm(d.get('whispree.llmProviderType')),
      "llmEnabled": bool(d.get('whispree.isLLMEnabled', settings['llmEnabled'])),
      "hasCompletedOnboarding": bool(d.get('whispree.hasCompletedOnboarding', settings['hasCompletedOnboarding'])),
      "screenshotContextEnabled": bool(d.get('whispree.isScreenshotContextEnabled', settings['screenshotContextEnabled'])),
      "screenshotPasteEnabled": bool(d.get('whispree.isScreenshotPasteEnabled', settings['screenshotPasteEnabled'])),
      "restoreBrowserTab": bool(d.get('whispree.restoreBrowserTab', settings['restoreBrowserTab'])),
      "restoreTerminalContext": bool(d.get('whispree.restoreTerminalContext', settings['restoreTerminalContext'])),
      "sharedDictionaryEnabled": bool(d.get('whispree.sharedDictionaryEnabled', settings['sharedDictionaryEnabled'])),
      "llmModelId": str(d.get('whispree.llmModelId', settings['llmModelId'])),
      "openaiModel": str(d.get('whispree.openaiModel', settings['openaiModel'])),
      "groqLLMModel": str(d.get('whispree.groqLLMModel', settings['groqLLMModel'])),
    })
    if 'whispree.domainWordSets' in d:
        settings['domainWordSets'] = decode_json_data(d['whispree.domainWordSets'], [])
    if 'whispree.toggleRecordingShortcut' in d:
        settings['toggleRecordingShortcut'] = shortcut_from_swift(decode_json_data(d['whispree.toggleRecordingShortcut'], {}), settings['toggleRecordingShortcut'])
    if 'whispree.quickFixShortcut' in d:
        settings['quickFixShortcut'] = shortcut_from_swift(decode_json_data(d['whispree.quickFixShortcut'], {}), settings['quickFixShortcut'])
    (user_data / 'settings.json').write_text(json.dumps(settings, ensure_ascii=False, indent=2)+"\n")
    history = []
    raw_history = decode_json_data(d.get('WhispreeHistory'), [])
    if isinstance(raw_history, list):
        for idx, r in enumerate(raw_history[:80]):
            if isinstance(r, dict):
                ts = r.get('timestamp')
                iso = cocoa_timestamp_to_iso(ts) if isinstance(ts,(int,float)) else datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
                history.append({
                  'id': str(r.get('id', f'swift-history-{idx}')),
                  'sequence': len(raw_history)-idx,
                  'originalText': str(r.get('originalText','')),
                  'correctedText': str(r.get('correctedText','')),
                  'deliveredAtIso': iso,
                })
    (user_data / 'history.json').write_text(json.dumps(history, ensure_ascii=False, indent=2)+"\n")
    meta = {
      'ok': True,
      'settingsFile': str(user_data / 'settings.json'),
      'historyFile': str(user_data / 'history.json'),
      'historyCount': len(history),
      'groqApiKeyConfigured': bool(str(d.get('whispree.groqApiKey','')).strip()),
      'domainWordSetCount': len(settings.get('domainWordSets') or []),
      'sttProviderType': settings['sttProviderType'],
      'llmProviderType': settings['llmProviderType'],
    }
    print(json.dumps(meta, ensure_ascii=False))
    return 0

def decode_json_data(v, fallback):
    if v is None: return fallback
    if isinstance(v, (bytes, bytearray)):
        try: return json.loads(v.decode('utf-8'))
        except Exception: return fallback
    if isinstance(v, str):
        try: return json.loads(v)
        except Exception: return fallback
    return fallback

def map_recording(v):
    return 'toggle' if str(v) == 'toggle' else 'push-to-talk'

def map_stt(v):
    s = str(v)
    return {'Groq': 'groq', 'MLX Audio': 'mlx-audio', 'WhisperKit': 'whisperkit'}.get(s, 'whisperkit')

def map_llm(v):
    s = str(v)
    return {'없음 (원문 사용)': 'none', '로컬 MLX': 'local', '로컬 LLM (Qwen3)': 'local', 'OpenAI (GPT)': 'openai', 'Groq Cloud': 'groq'}.get(s, 'none')

def shortcut_from_swift(obj, fallback):
    if not isinstance(obj, dict): return fallback
    if isinstance(obj.get('combo'), dict):
        c=obj['combo']; key=int(c.get('keyCode', fallback.get('keyCode',0))); mods=int(c.get('modifiersRaw', fallback.get('modifiersRaw',0)))
        return {'kind':'combo','keyCode':key,'modifiersRaw':mods,'label': modifier_label(mods)+key_label(key)}
    if isinstance(obj.get('modifierOnly'), dict):
        c=obj['modifierOnly']; key=int(c.get('keyCode', fallback.get('keyCode',0)))
        return {'kind':'modifier-only','keyCode':key,'label': key_label(key)}
    return fallback

def modifier_label(raw):
    # Swift KeyboardShortcuts Carbon flags seen in this app: 655360 == ctrl+option+shift, 393216 == ctrl+shift.
    if raw == 655360: return '⌃⌥⇧'
    if raw == 393216: return '⌃⇧'
    if raw == 2048: return '⌘'
    if raw == 2560: return '⌃⇧'
    return ''

def key_label(key):
    table={2:'D',15:'R',49:'Space',61:'R⌥',58:'⌥',59:'⌃',60:'⇧',55:'⌘'}
    return table.get(key, str(key))

def cocoa_timestamp_to_iso(ts):
    unix = float(ts) + 978307200.0
    return datetime.fromtimestamp(unix, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')

if __name__ == '__main__':
    raise SystemExit(main())
