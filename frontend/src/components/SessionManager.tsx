import { useState } from 'react';
import { Session } from '../types/session';
import { SessionForm } from './SessionForm';

interface SessionManagerProps {
  sessions: Session[];
  onAddSession: (data: { name: string; host: string; port: number; username: string }) => void;
  onUpdateSession: (id: string, data: Partial<Session>) => void;
  onDeleteSession: (id: string) => void;
  onSelectSession: (session: Session) => void;
}

export function SessionManager({
  sessions,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onSelectSession,
}: SessionManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const handleFormSubmit = (data: { name: string; host: string; port: number; username: string }) => {
    if (editingSession) {
      onUpdateSession(editingSession.id, data);
      setEditingSession(null);
    } else {
      onAddSession(data);
    }
    setShowForm(false);
  };

  return (
    <div
      style={{
        width: '280px',
        backgroundColor: '#252526',
        borderRight: '1px solid #3d3d3d',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #3d3d3d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>Sessions</h2>
        <button
          onClick={() => {
            setEditingSession(null);
            setShowForm(true);
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#007acc',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          + Add
        </button>
      </div>

      {showForm && (
        <SessionForm
          initialSession={editingSession || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingSession(null);
          }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 500, marginBottom: '4px' }}>
              {session.name}
            </div>
            <div style={{ color: '#888', fontSize: '12px' }}>
              {session.username}@{session.host}:{session.port}
            </div>
            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                gap: '8px',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSession(session);
                  setShowForm(true);
                }}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#3d3d3d',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ccc',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '44px',
                  minHeight: '36px',
                }}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this session?')) {
                    onDeleteSession(session.id);
                  }
                }}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#d32f2f',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '44px',
                  minHeight: '36px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {sessions.length === 0 && !showForm && (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
            No sessions yet.
            <br />
            Click "+ Add" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
