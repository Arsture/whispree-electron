import { useMemo, useState, type KeyboardEvent } from 'react';
import { SidebarShell } from './components/SidebarShell';
import { useAppSnapshot } from './hooks/useAppSnapshot';
import { useSettings } from './hooks/useSettings';
import { PanelContent } from './panels/PanelContent';
import { SIDEBAR_SECTIONS, nextSectionId, type SidebarSectionId, type TabNavigationKey } from './ui-model';

export function App() {
  const snapshot = useAppSnapshot();
  const { settings, updateSettings } = useSettings();
  const [activeSection, setActiveSection] = useState<SidebarSectionId>('home');
  const [visitedSections, setVisitedSections] = useState<ReadonlySet<SidebarSectionId>>(() => new Set(['home']));
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visited = useMemo(() => new Set(visitedSections), [visitedSections]);

  function selectSection(sectionId: SidebarSectionId) {
    setVisitedSections((current) => new Set([...current, sectionId]));
    setActiveSection(sectionId);
  }

  function selectAndFocusSection(sectionId: SidebarSectionId) {
    selectSection(sectionId);
    window.requestAnimationFrame(() => document.getElementById(`tab-${sectionId}`)?.focus());
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, sectionId: SidebarSectionId) {
    if (!isTabNavigationKey(event.key)) return;
    event.preventDefault();
    selectAndFocusSection(nextSectionId(sectionId, event.key));
  }

  return (
    <main className="app-shell" data-view="whispree-shell" data-app-status={snapshot.appStatus} data-sidebar-collapsed={isSidebarCollapsed}>
      <SidebarShell
        activeSection={activeSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onSelectSection={selectSection}
        onTabKeyDown={handleTabKeyDown}
      />

      <section className="detail-shell">
        <div className="titlebar-spacer" aria-hidden="true" />
        {SIDEBAR_SECTIONS.map((section) => {
          const isVisited = visited.has(section.id);
          const isActive = activeSection === section.id;
          return (
            <section
              role="tabpanel"
              id={`panel-${section.id}`}
              aria-labelledby={`tab-${section.id}`}
              data-panel={section.id}
              data-active={isActive}
              data-visited={isVisited}
              hidden={!isActive}
              className="detail-panel"
              key={section.id}
            >
              <PanelContent sectionId={section.id} snapshot={snapshot} settings={settings} onUpdateSettings={updateSettings} />
            </section>
          );
        })}
      </section>
    </main>
  );
}

function isTabNavigationKey(value: string): value is TabNavigationKey {
  return value === 'ArrowDown' || value === 'ArrowRight' || value === 'ArrowUp' || value === 'ArrowLeft' || value === 'Home' || value === 'End';
}
