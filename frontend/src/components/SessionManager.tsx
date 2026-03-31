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
    <div className="w-[280px] bg-bg-surface border-r border-border-default flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border-default flex justify-between items-center">
        <h2 className="text-sm font-semibold text-text-primary m-0">Hosts</h2>
        <button
          onClick={() => {
            setEditingSession(null);
            setShowForm(true);
          }}
          className="px-3 py-1.5 bg-accent-primary hover:bg-accent-hover text-white text-xs rounded-md cursor-pointer transition-colors font-medium"
        >
          + New Host
        </button>
      </div>

      {/* Form */}
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

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className="group p-3 bg-bg-elevated hover:bg-bg-overlay rounded-lg cursor-pointer transition-all duration-150 border border-transparent hover:border-border-default"
          >
            <div className="flex items-center gap-2 mb-1.5">
              {/* Status dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
              <span className="text-text-primary font-medium text-sm truncate">
                {session.name}
              </span>
            </div>
            <div className="text-text-secondary text-xs pl-3.5 truncate">
              {session.username}@{session.host}:{session.port}
            </div>
            <div className="mt-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSession(session);
                  setShowForm(true);
                }}
                className="px-2 py-1 bg-transparent border border-border-default rounded text-text-secondary text-xs cursor-pointer hover:text-text-primary hover:border-text-muted transition-colors"
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
                className="px-2 py-1 bg-transparent border border-accent-danger/30 rounded text-accent-danger text-xs cursor-pointer hover:bg-accent-danger/10 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {sessions.length === 0 && !showForm && (
          <div className="text-text-muted text-center py-8 text-sm">
            No hosts yet.
            <br />
            Click <span className="text-accent-primary">"+ New Host"</span> to add one.
          </div>
        )}
      </div>
    </div>
  );
}
