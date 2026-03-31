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
  const [error, setError] = useState('');

  const { connect, send, sshReady } = useWebSocket({
    sessionId,
    host,
    port,
    username,
    password,
    onMessage: (data) => {
      xtermRef.current?.write(data);
    },
    onError: (error) => {
      setError(error);
      setIsConnecting(false);
    },
    onSshConnect: () => {
      setError('');
      setIsConnecting(false);
    },
  });

  const handleConnect = () => {
    if (!password) return;
    setError('');
    setIsConnecting(true);
    connect();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  // Initialize xterm after SSH is ready
  useEffect(() => {
    if (!sshReady || !containerRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      cursorBlink: true,
      convertEol: true,
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#e6edf3',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff',
      },
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

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
      xtermRef.current = null;
    };
  }, [sshReady, send]);

  // Password prompt
  if (!sshReady) {
    const status = error ? '' : isConnecting ? 'Connecting...' : '';
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-base">
        <div className="p-8 bg-bg-overlay rounded-xl border border-border-default flex flex-col gap-5 min-w-[360px]">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center border border-border-default">
              <span className="text-text-secondary text-xl">{">"}</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-text-primary text-base text-center font-medium">
            {status || `Connect to ${host}`}
          </div>

          {/* Error */}
          {error && (
            <div className="text-accent-danger text-sm text-center bg-accent-danger/10 py-2 px-3 rounded-md">
              {error}
            </div>
          )}

          {/* Form */}
          {!isConnecting && (
            <>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
                autoFocus
                className="w-full px-4 py-3 bg-bg-elevated border border-border-default rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:border-accent-primary focus:outline-none transition-colors"
              />
              <button
                onClick={handleConnect}
                disabled={!password}
                className={`w-full py-3 text-white text-sm rounded-lg cursor-pointer transition-colors font-medium ${
                  password
                    ? 'bg-accent-primary hover:bg-accent-hover'
                    : 'bg-bg-elevated text-text-muted cursor-not-allowed'
                }`}
              >
                Connect
              </button>
            </>
          )}

          {/* Connecting spinner */}
          {isConnecting && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-bg-base"
    />
  );
}
