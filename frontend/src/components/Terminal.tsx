import { useRef, useState, useEffect } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWebSocket } from '../hooks/useWebSocket';

interface TerminalProps {
  sessionId: string;
  host: string;
  port: number;
  username: string;
}

export function Terminal({ sessionId, host, port, username }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const { connect, send } = useWebSocket({
    sessionId,
    host,
    port,
    username,
    password,
    onMessage: (data) => {
      xtermRef.current?.write(data);
    },
    onError: (error) => {
      xtermRef.current?.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m`);
      setIsConnecting(false);
    },
    onConnect: () => {
      setIsConnecting(false);
    },
  });

  const handleConnect = () => {
    if (!password) return;
    setIsConnecting(true);

    // Initialize xterm first
    if (!xtermRef.current && containerRef.current) {
      const xterm = new XTerm({
        fontSize: 16,
        cursorBlink: true,
        convertEol: true,
      });
      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(containerRef.current);
      fitAddon.fit();

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      xterm.onData((data) => {
        send({ type: 'input', data });
      });

      const handleResize = () => {
        fitAddon.fit();
        send({ type: 'resize', cols: xterm.cols, rows: xterm.rows });
      };
      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 100);
    }

    connect();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  // Cleanup resize listener on unmount
  useEffect(() => {
    return () => {
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
    };
  }, []);

  // Show password prompt
  if (!password || isConnecting) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e1e1e',
        }}
      >
        <div
          style={{
            padding: '24px',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: '300px',
          }}
        >
          <div style={{ color: '#fff', fontSize: '18px', textAlign: 'center' }}>
            {isConnecting ? 'Connecting...' : `Connect to ${host}`}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Password"
            disabled={isConnecting}
            style={{
              padding: '12px',
              backgroundColor: '#3d3d3d',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '16px',
            }}
          />
          <button
            onClick={handleConnect}
            disabled={!password || isConnecting}
            style={{
              padding: '14px',
              backgroundColor: '#007acc',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '16px',
              cursor: password && !isConnecting ? 'pointer' : 'not-allowed',
              opacity: password && !isConnecting ? 1 : 0.6,
              minHeight: '44px',
            }}
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
}