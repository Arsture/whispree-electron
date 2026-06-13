import type { AppSnapshot } from '../../shared/ipc';
import { SETTINGS_PLACEHOLDERS, type SidebarSectionId } from '../ui-model';
import { HistoryPanel } from './HistoryPanel';
import { HomePanel } from './HomePanel';
import { PlaceholderSection } from './SettingsPanels';

export function PanelContent({ sectionId, snapshot }: { readonly sectionId: SidebarSectionId; readonly snapshot: AppSnapshot }) {
  if (sectionId === 'home') return <HomePanel snapshot={snapshot} />;
  if (sectionId === 'history') return <HistoryPanel snapshot={snapshot} />;
  return <PlaceholderSection groups={SETTINGS_PLACEHOLDERS[sectionId]} />;
}
