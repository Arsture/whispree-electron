import type { AppSnapshot } from '../../shared/ipc';
import type { AppSettingsSnapshot, AppSettingsUpdate } from '../../shared/settings';
import { SETTINGS_PLACEHOLDERS, type SidebarSectionId } from '../ui-model';
import { HistoryPanel } from './HistoryPanel';
import { HomePanel } from './HomePanel';
import { SettingsPanel } from './SettingsPanels';

export function PanelContent({
  sectionId,
  snapshot,
  settings,
  onUpdateSettings,
}: {
  readonly sectionId: SidebarSectionId;
  readonly snapshot: AppSnapshot;
  readonly settings: AppSettingsSnapshot;
  readonly onUpdateSettings: (update: AppSettingsUpdate) => Promise<void>;
}) {
  if (sectionId === 'home') return <HomePanel snapshot={snapshot} />;
  if (sectionId === 'history') return <HistoryPanel snapshot={snapshot} />;
  return <SettingsPanel sectionId={sectionId} groups={SETTINGS_PLACEHOLDERS[sectionId]} settings={settings} onUpdateSettings={onUpdateSettings} />;
}
