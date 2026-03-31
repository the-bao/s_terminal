import { useState } from 'react';
import { Session } from '../types/session';

interface SessionFormProps {
  initialSession?: Partial<Session>;
  onSubmit: (data: { name: string; host: string; port: number; username: string }) => void;
  onCancel: () => void;
}

export function SessionForm({ initialSession, onSubmit, onCancel }: SessionFormProps) {
  const [name, setName] = useState(initialSession?.name || '');
  const [host, setHost] = useState(initialSession?.host || '');
  const [port, setPort] = useState(initialSession?.port || 22);
  const [username, setUsername] = useState(initialSession?.username || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host || !username) return;
    onSubmit({ name, host, port, username });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div>
        <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
          Session Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Server"
          required
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3d3d3d',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
          Host *
        </label>
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.1.100"
          required
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3d3d3d',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
          Port
        </label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value) || 22)}
          placeholder="22"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3d3d3d',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
          Username *
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
          required
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3d3d3d',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#007acc',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          {initialSession ? 'Update' : 'Add'} Session
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#555',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
