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

  const inputClass =
    'w-full px-3 py-2.5 bg-bg-elevated border border-border-default rounded-md text-text-primary text-sm placeholder:text-text-muted focus:border-accent-primary focus:outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
      <div>
        <label className="block mb-1.5 text-text-secondary text-xs font-medium">
          Label *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Server"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block mb-1.5 text-text-secondary text-xs font-medium">
          Host *
        </label>
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.1.100"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block mb-1.5 text-text-secondary text-xs font-medium">
          Port
        </label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value) || 22)}
          placeholder="22"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block mb-1.5 text-text-secondary text-xs font-medium">
          Username *
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
          required
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 mt-1">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-accent-primary hover:bg-accent-hover text-white text-sm rounded-md cursor-pointer transition-colors font-medium"
        >
          {initialSession ? 'Update' : 'Add Host'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-bg-elevated hover:bg-bg-overlay text-text-secondary text-sm rounded-md cursor-pointer border border-border-default transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
