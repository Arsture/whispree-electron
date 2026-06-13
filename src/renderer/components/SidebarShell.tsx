import type { KeyboardEvent } from 'react';
import { SIDEBAR_SECTIONS, type SidebarSectionDefinition, type SidebarSectionId } from '../ui-model';

function SectionIcon({ section }: { readonly section: SidebarSectionDefinition }) {
  return (
    <span className="sidebar-icon" data-icon-tone={section.iconTone} aria-hidden="true">
      {section.icon}
    </span>
  );
}

export function SidebarShell({
  activeSection,
  isCollapsed,
  onToggleCollapsed,
  onSelectSection,
  onTabKeyDown,
}: {
  readonly activeSection: SidebarSectionId;
  readonly isCollapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly onSelectSection: (sectionId: SidebarSectionId) => void;
  readonly onTabKeyDown: (event: KeyboardEvent<HTMLButtonElement>, sectionId: SidebarSectionId) => void;
}) {
  return (
    <aside className="sidebar" data-collapsed={isCollapsed} aria-label="Whispree sections">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleCollapsed}
      >
        ◫
      </button>
      <nav role="tablist" aria-label="Whispree tabs" className="sidebar-tabs">
        {SIDEBAR_SECTIONS.map((section) => (
          <button
            type="button"
            role="tab"
            key={section.id}
            id={`tab-${section.id}`}
            aria-selected={activeSection === section.id}
            aria-controls={`panel-${section.id}`}
            data-tab={section.id}
            data-selected={activeSection === section.id}
            data-icon-tone={section.iconTone}
            className="sidebar-tab"
            tabIndex={activeSection === section.id ? 0 : -1}
            onClick={() => onSelectSection(section.id)}
            onKeyDown={(event) => onTabKeyDown(event, section.id)}
          >
            <SectionIcon section={section} />
            <span className="sidebar-label">{isCollapsed ? section.shortLabel : section.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
