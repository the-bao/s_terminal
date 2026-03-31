import { useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { Session } from './types/session';
import { useSessions } from './hooks/useSessions';
import { SessionManager } from './components/SessionManager';
import { TabBar } from './components/TabBar';
import { Terminal } from './components/Terminal';

interface OpenTab {
  session: Session;
  key: string; // unique key for React list
}

function App() {
  const { sessions, addSession, updateSession, deleteSession } = useSessions();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

  const handleSelectSession = (session: Session) => {
    // Check if already open
    const existing = openTabs.find((t) => t.session.id === session.id);
    if (existing) {
      setActiveTabKey(existing.key);
      return;
    }

    // Open new tab
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1e1e1e',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#323233',
          padding: '12px 16px',
          borderBottom: '1px solid #3d3d3d',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Super Terminal</h1>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Session Manager Sidebar */}
        <SessionManager
          sessions={sessions}
          onAddSession={addSession}
          onUpdateSession={updateSession}
          onDeleteSession={deleteSession}
          onSelectSession={handleSelectSession}
        />

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ flex: 1 }}>
              <Terminal
                sessionId={activeTab.session.id}
                host={activeTab.session.host}
                port={activeTab.session.port}
                username={activeTab.session.username}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
              }}
            >
              Select a session from the sidebar to connect
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
