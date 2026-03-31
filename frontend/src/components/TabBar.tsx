import { Session } from '../types/session';

interface TabBarProps {
  tabs: Session[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #3d3d3d',
        overflowX: 'auto',
        padding: '4px 4px 0',
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: tab.id === activeTabId ? '#1e1e1e' : '#2d2d2d',
            color: tab.id === activeTabId ? '#fff' : '#888',
            cursor: 'pointer',
            borderTop: tab.id === activeTabId ? '2px solid #007acc' : '2px solid transparent',
            minWidth: '120px',
            maxWidth: '200px',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {tab.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
