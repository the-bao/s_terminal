import { useRef, useCallback, useEffect, useState } from 'react';
import { ClientMessage, ServerMessage } from '../types/session';

interface UseWebSocketOptions {
  sessionId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  onMessage: (data: string) => void;
  onConnect?: () => void;
  onError?: (error: string) => void;
}

export function useWebSocket({
  sessionId: _sessionId,
  host,
  port,
  username,
  password,
  onMessage,
  onConnect,
  onError,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ssh/${host}/${port}/${username}/${password}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === 'output') {
          onMessage(msg.data);
        } else if (msg.type === 'error') {
          onError?.(msg.message);
        } else if (msg.type === 'connected') {
          // Initial connection confirmed
        }
      } catch {
        onMessage(event.data);
      }
    };

    ws.onerror = () => {
      onError?.('WebSocket connection failed');
    };

    ws.onclose = () => {
      setConnected(false);
    };
  }, [host, port, username, password, onMessage, onConnect, onError]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, send, connected };
}
