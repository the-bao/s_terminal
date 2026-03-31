import { useState, useEffect, useCallback } from 'react';
import { Session } from '../types/session';

const STORAGE_KEY = 's_terminal_sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch {
        setSessions([]);
      }
    }
  }, []);

  const saveToStorage = useCallback((newSessions: Session[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
  }, []);

  const addSession = useCallback((session: Omit<Session, 'id' | 'createdAt'>) => {
    const newSession: Session = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setSessions(prev => {
      const updated = [...prev, newSession];
      saveToStorage(updated);
      return updated;
    });
    return newSession;
  }, [saveToStorage]);

  const updateSession = useCallback((id: string, updates: Partial<Session>) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  return { sessions, addSession, updateSession, deleteSession };
}