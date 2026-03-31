import { Session } from '../types/session';

interface TabBarProps {
  tabs: Session[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div className="flex bg-bg-surface border-b border-border-default overflow-x-auto px-1 pt-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`
              flex items-center px-3 py-2 cursor-pointer min-w-[120px] max-w-[200px] transition-colors
              ${isActive
                ? 'bg-bg-base text-text-primary border-t-2 border-accent-primary'
                : 'bg-bg-surface text-text-muted border-t-2 border-transparent hover:text-text-secondary'}
            `}
          >
            {/* Connection indicator */}
            <div className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${isActive ? 'bg-accent-success' : 'bg-text-muted'}`} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-sm">
              {tab.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="bg-transparent border-none text-text-muted cursor-pointer p-1 px-1.5 text-xs hover:text-accent-danger transition-colors rounded hover:bg-bg-elevated"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
