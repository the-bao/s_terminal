import { useState } from 'react';
import { Session } from './types/session';
import { useSessions } from './hooks/useSessions';
import { SessionManager } from './components/SessionManager';
import { TabBar } from './components/TabBar';
import { Terminal } from './components/Terminal';

interface OpenTab {
  session: Session;
  key: string;
}

function App() {
  const { sessions, addSession, updateSession, deleteSession } = useSessions();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

  const handleSelectSession = (session: Session) => {
    const existing = openTabs.find((t) => t.session.id === session.id);
    if (existing) {
      setActiveTabKey(existing.key);
      return;
    }
    const key = `${session.id}-${Date.now()}`;
    setOpenTabs((prev) => [...prev, { session, key }]);
    setActiveTabKey(key);
  };

  const handleCloseTab = (key: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t.key !== key);
      if (activeTabKey === key && newTabs.length > 0) {
        setActiveTabKey(newTabs[newTabs.length - 1].key);
      } else if (newTabs.length === 0) {
        setActiveTabKey(null);
      }
      return newTabs;
    });
  };

  const activeTab = openTabs.find((t) => t.key === activeTabKey);

  return (
    <div className="flex flex-col h-screen bg-bg-base text-text-primary">
      {/* Header */}
      <div className="bg-bg-surface px-5 py-3 border-b border-border-default flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent-success shadow-[0_0_6px_rgba(63,185,80,0.5)]" />
        <h1 className="text-base font-semibold text-text-primary tracking-wide m-0">
          Super Terminal
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Session Manager Sidebar */}
        <SessionManager
          sessions={sessions}
          onAddSession={addSession}
          onUpdateSession={updateSession}
          onDeleteSession={deleteSession}
          onSelectSession={handleSelectSession}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar */}
          {openTabs.length > 0 && (
            <TabBar
              tabs={openTabs.map((t) => t.session)}
              activeTabId={activeTab?.session.id || null}
              onSelectTab={(id) => {
                const tab = openTabs.find((t) => t.session.id === id);
                if (tab) setActiveTabKey(tab.key);
              }}
              onCloseTab={(id) => {
                const tab = openTabs.find((t) => t.session.id === id);
                if (tab) handleCloseTab(tab.key);
              }}
            />
          )}

          {/* Terminal Area */}
          {activeTab ? (
            <div className="flex-1 min-h-0">
              <Terminal
                sessionId={activeTab.session.id}
                host={activeTab.session.host}
                port={activeTab.session.port}
                username={activeTab.session.username}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select a session from the sidebar to connect
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
