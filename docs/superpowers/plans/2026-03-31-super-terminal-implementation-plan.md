# Super Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based SSH session manager with multi-tab support for iPad browsers.

**Architecture:** React frontend connects via WebSocket to a Rust backend that bridges to SSH servers. Session configs stored in browser localStorage.

**Tech Stack:** React + TypeScript + xterm.js (frontend) | Rust + tokio + ssh2 + tokio-tungstenite (backend)

---

## File Structure

```
s_terminal/
├── backend/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs           # Entry, WebSocket server setup
│       ├── message.rs         # WebSocket message types
│       ├── ssh.rs             # SSH connection pool management
│       └── ws_handler.rs      # WebSocket message routing
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        │   └── session.ts
        ├── hooks/
        │   ├── useSessions.ts
        │   └── useWebSocket.ts
        └── components/
            ├── SessionManager.tsx
            ├── TabBar.tsx
            ├── Terminal.tsx
            └── SessionForm.tsx
```

---

## Part 1: Rust Backend

### Task 1: Rust Project Setup

**Files:**
- Create: `backend/Cargo.toml`
- Create: `backend/src/main.rs` (stub)
- Create: `backend/src/message.rs` (stub)
- Create: `backend/src/ssh.rs` (stub)
- Create: `backend/src/ws_handler.rs` (stub)

- [ ] **Step 1: Create Cargo.toml with dependencies**

```toml
[package]
name = "s_terminal"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.21"
futures-util = "0.3"
ssh2 = "0.9"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
log = "0.4"
env_logger = "0.11"
parking_lot = "0.12"
uuid = { version = "1", features = ["v4"] }
```

- [ ] **Step 2: Create stub source files**

Create minimal stub `main.rs`, `message.rs`, `ssh.rs`, `ws_handler.rs` that compile but do nothing.

- [ ] **Step 3: Verify project compiles**

Run: `cd backend && cargo check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: scaffold Rust backend project"
```

---

### Task 2: Message Protocol (message.rs)

**Files:**
- Modify: `backend/src/message.rs`

- [ ] **Step 1: Define message types**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    #[serde(rename = "resize")]
    Resize { cols: u16, rows: u16 },
    #[serde(rename = "input")]
    Input { data: String },
    #[serde(rename = "ping")]
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage {
    #[serde(rename = "output")]
    Output { data: String },
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "connected")]
    Connected,
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && cargo check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/message.rs
git commit -m "feat(backend): define WebSocket message protocol"
```

---

### Task 3: SSH Connection Manager (ssh.rs)

**Files:**
- Modify: `backend/src/ssh.rs`

- [ ] **Step 1: Implement SSH session struct and manager**

```rust
use parking_lot::Mutex;
use ssh2::{Session, DisconnectCode};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Arc;
use ssh2::Channel;

pub struct SshSession {
    session: Session,
    stream: TcpStream,
    channel: Channel<TcpStream>,
}

pub struct SshManager {
    sessions: Mutex<HashMap<String, Arc<Mutex<SshSession>>>>,
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn connect(&self, id: &str, host: &str, port: u16, username: &str, password: &str) -> Result<(), String> {
        let addr = format!("{}:{}", host, port);
        let mut stream = TcpStream::connect(&addr).map_err(|e| e.to_string())?;
        stream.set_read_timeout(Some(std::time::Duration::from_secs(60)))
              .map_err(|e| e.to_string())?;

        let mut session = Session::new().map_err(|e| e.to_string())?;
        session.set_tcp_stream(stream.try_clone().map_err(|e| e.to_string())?);
        session.handshake().map_err(|e| e.to_string())?;

        // Authenticate with password
        session.userauth_password(username, password).map_err(|e| e.to_string())?;
        if !session.authenticated() {
            return Err("Authentication failed".to_string());
        }

        // Open a shell channel
        let mut channel = session.channel(0).map_err(|e| e.to_string())?;
        channel.request_pty(
            ssh2:: PtyModes::empty(),
            "xterm-256color",
            80,
            24,
            0,
            0,
            &[],
        ).map_err(|e| e.to_string())?;
        channel.shell().map_err(|e| e.to_string())?;

        self.sessions.lock().insert(
            id.to_string(),
            Arc::new(Mutex::new(SshSession { session, stream, channel }))
        );

        Ok(())
    }

    pub fn disconnect(&self, id: &str) {
        if let Some(ssh) = self.sessions.lock().remove(id) {
            let _ = ssh.lock().session.disconnect(DisconnectCode::Idle, "", None);
        }
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.write(data).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn read(&self, id: &str, buf: &mut [u8]) -> Result<usize, String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.read(buf).map_err(|e| e.to_string())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.request_pty_size(cols, rows, 0, 0).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn is_connected(&self, id: &str) -> bool {
        self.sessions.lock().contains_key(id)
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && cargo check`
Expected: No errors (may have warnings about unused fields)

- [ ] **Step 3: Commit**

```bash
git add backend/src/ssh.rs
git commit -m "feat(backend): add SSH connection manager with connect/disconnect/read/write"
```

---

### Task 4: WebSocket Handler (ws_handler.rs)

**Files:**
- Modify: `backend/src/ws_handler.rs`

- [ ] **Step 1: Implement WebSocket handler**

```rust
use crate::message::{ClientMessage, ServerMessage};
use crate::ssh::SshManager;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use uuid::Uuid;

pub async fn handle_connection(
    ws: WebSocketStream<tokio::net::TcpStream>,
    ssh_manager: Arc<SshManager>,
    host: String,
    port: u16,
    username: String,
    password: String,
) {
    let session_id = Uuid::new_v4().to_string();
    let (mut write, mut read) = ws.split();

    // Connect to SSH
    if let Err(e) = ssh_manager.connect(&session_id, &host, port, &username, &password) {
        let msg = ServerMessage::Error { message: e };
        let _ = write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await;
        return;
    }

    // Send connected message
    let connected = ServerMessage::Connected;
    let _ = write.send(Message::Text(serde_json::to_string(&connected).unwrap())).await;

    // Spawn reader task
    let reader_id = session_id.clone();
    let reader_ssh = Arc::clone(&ssh_manager);
    let (tx, mut rx) = mpsc::channel(100);

    tokio::spawn(async move {
        let mut buf = [0u8; 8192];
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            match reader_ssh.read(&reader_id, &mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(data).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    // Main event loop
    loop {
        tokio::select! {
            // WebSocket input
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            match client_msg {
                                ClientMessage::Input { data } => {
                                    let _ = ssh_manager.write(&session_id, data.as_bytes());
                                }
                                ClientMessage::Resize { cols, rows } => {
                                    let _ = ssh_manager.resize(&session_id, cols, rows);
                                }
                                ClientMessage::Ping => {
                                    let msg = ServerMessage::Pong;
                                    let _ = write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await;
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            // SSH output forward
            data = rx.recv() => {
                if let Some(data) = data {
                    let msg = ServerMessage::Output { data };
                    if write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    ssh_manager.disconnect(&session_id);
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && cargo check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/ws_handler.rs
git commit -m "feat(backend): add WebSocket handler for SSH bridging"
```

---

### Task 5: Main Server (main.rs)

**Files:**
- Modify: `backend/src/main.rs`

- [ ] **Step 1: Implement main server**

```rust
mod message;
mod ssh;
mod ws_handler;

use crate::ssh::SshManager;
use crate::ws_handler::handle_connection;
use futures_util::FutureExt;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_hdr_async;
use log::{info, error};

#[tokio::main]
async fn main() {
    env_logger::init();
    info!("Starting Super Terminal server...");

    let ssh_manager = Arc::new(SshManager::new());
    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    info!("Listening on ws://0.0.0.0:8080");

    while let Ok((stream, addr)) = listener.accept().await {
        info!("New connection from {}", addr);
        let ssh_manager = Arc::clone(&ssh_manager);

        tokio::spawn(async move {
            let ws = accept_hdr_async(stream, |req, res| {
                // Extract path and query params
                // URL format: /ssh/{host}/{port}/{username}/{password}
                if let Some(path) = req.uri().path_and_query() {
                    let path_str = path.to_string();
                    // Path starts with /ssh/, skip first 5 chars
                    let after_ssh = &path_str[5..];
                    let parts: Vec<&str> = after_ssh.split('/').collect();
                    if parts.len() >= 4 {
                        let host = parts[0].to_string();
                        let port: u16 = parts[1].parse().unwrap_or(22);
                        let username = parts[2].to_string();
                        let password = parts[3].to_string();

                        handle_connection(ws, ssh_manager, host, port, username, password).await;
                        return Ok(res);
                    }
                }
                error!("Invalid request path");
                Ok(res)
            }).await;
        });
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && cargo check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/main.rs
git commit -m "feat(backend): implement WebSocket SSH bridge server"
```

---

## Part 2: React Frontend

### Task 6: Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx` (stub)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "s-terminal-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/ssh': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
})
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Super Terminal</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create stub main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 6: Install dependencies**

Run: `cd frontend && npm install`
Expected: Dependencies installed

- [ ] **Step 7: Verify dev server starts**

Run: `cd frontend && npm run dev -- --host`
Expected: Vite dev server running on port 3000

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/tsconfig.json frontend/index.html frontend/src/
git commit -m "feat: scaffold React frontend with Vite and xterm.js"
```

---

### Task 7: Session Types

**Files:**
- Create: `frontend/src/types/session.ts`

- [ ] **Step 1: Define types**

```typescript
export interface Session {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  createdAt: number;
}

export interface ClientMessage {
  type: 'resize';
  cols: number;
  rows: number;
} | {
  type: 'input';
  data: string;
} | {
  type: 'ping';
};

export interface ServerMessage {
  type: 'output';
  data: string;
} | {
  type: 'pong';
} | {
  type: 'error';
  message: string;
} | {
  type: 'connected';
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/session.ts
git commit -m "feat(frontend): define Session and message types"
```

---

### Task 8: useSessions Hook

**Files:**
- Create: `frontend/src/hooks/useSessions.ts`

- [ ] **Step 1: Implement hook**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSessions.ts
git commit -m "feat(frontend): add useSessions hook for localStorage persistence"
```

---

### Task 9: useWebSocket Hook

**Files:**
- Create: `frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Implement hook**

```typescript
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
  sessionId,
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useWebSocket.ts
git commit -m "feat(frontend): add useWebSocket hook for SSH bridge communication"
```

---

### Task 10: Terminal Component

**Files:**
- Create: `frontend/src/components/Terminal.tsx`
- Modify: `frontend/src/App.tsx` (update Terminal usage)

- [ ] **Step 1: Implement component with password prompt**

```typescript
import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWebSocket } from '../hooks/useWebSocket';
import { ClientMessage } from '../types/session';

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
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const { connect, disconnect, send } = useWebSocket({
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
```

- [ ] **Step 2: Add xterm styles import to App.tsx**

Add to App.tsx:
```typescript
import '@xterm/xterm/css/xterm.css';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Terminal.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add Terminal component with xterm.js"
```

---

### Task 11: TabBar Component

**Files:**
- Create: `frontend/src/components/TabBar.tsx`

- [ ] **Step 1: Implement component**

```typescript
import { Session } from '../types/session';

interface TabBarProps {
  tabs: Session[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #3d3d3d',
        overflowX: 'auto',
        padding: '4px 4px 0',
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: tab.id === activeTabId ? '#1e1e1e' : '#2d2d2d',
            color: tab.id === activeTabId ? '#fff' : '#888',
            cursor: 'pointer',
            borderTop: tab.id === activeTabId ? '2px solid #007acc' : '2px solid transparent',
            minWidth: '120px',
            maxWidth: '200px',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {tab.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TabBar.tsx
git commit -m "feat(frontend): add TabBar component"
```

---

### Task 12: SessionForm Component

**Files:**
- Create: `frontend/src/components/SessionForm.tsx`

- [ ] **Step 1: Implement component**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SessionForm.tsx
git commit -m "feat(frontend): add SessionForm component for adding/editing sessions"
```

---

### Task 13: SessionManager Component

**Files:**
- Create: `frontend/src/components/SessionManager.tsx`

- [ ] **Step 1: Implement component**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SessionManager.tsx
git commit -m "feat(frontend): add SessionManager component"
```

---

### Task 14: App Component

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implement App**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify in browser (manual test)**

Run: `cd frontend && npm run dev -- --host`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): integrate all components in App"
```

---

## Integration Verification

### Task 15: End-to-End Test

- [ ] **Step 1: Start backend**

Run: `cd backend && cargo run`
Expected: Server listening on ws://0.0.0.0:8080

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev -- --host`
Expected: Vite dev server on port 3000

- [ ] **Step 3: Open browser**

Navigate to http://localhost:3000

- [ ] **Step 4: Add a test session**

- Click "+ Add"
- Fill in: Name="Test", Host="example.com", Port=22, Username="testuser"
- Submit

- [ ] **Step 5: Connect to session**

- Click on the added session in sidebar
- Verify WebSocket connects and terminal renders

- [ ] **Step 6: Open multiple tabs**

- Select same or different session
- Verify multiple tabs appear in TabBar

- [ ] **Step 7: Test close tab**

- Click × on a tab
- Verify tab closes and SSH connection terminates

---

## Next Steps After MVP

- Add password authentication via SSH keyboard-interactive
- Add session configuration export/import
- Add connection status indicators
- Implement reconnection on network drop
- Add dark/light theme toggle
