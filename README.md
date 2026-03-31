# Super Terminal

A web-based SSH session manager with multi-tab support, designed for iPad browsers.

## Features

- **Multi-Tab SSH Sessions** - Open multiple SSH connections in separate tabs
- **Session Management** - Save and organize SSH connection configurations
- **iPad Optimized** - Touch-friendly UI with proper touch targets
- **Web-Based** - Access your terminals from any browser

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + xterm.js |
| Backend | Rust + tokio + ssh2 + tokio-tungstenite |
| Storage | Browser localStorage |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                              │
│  ┌──────────┐  ┌──────────────────────────────────────┐ │
│  │ Session  │  │           xterm.js Terminal          │ │
│  │ Manager  │  │                                      │ │
│  └──────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              │ WebSocket (ws://host:8081/ssh/...)
              ▼
┌─────────────────────────────────────────────────────────┐
│              Rust WebSocket Server                       │
│  - Maintains SSH connection pool                        │
│  - Bridges terminal input/output                         │
└─────────────────────────────────────────────────────────┘
              │ SSH (port 22)
              ▼
┌─────────────────────────────────────────────────────────┐
│                   Remote SSH Server                      │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Rust (latest stable)
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
cargo run
```

The backend server starts on `ws://0.0.0.0:8081`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host
```

Access the app at `http://localhost:3000`.

### Usage

1. Click **+ Add** in the sidebar to create a new session
2. Fill in the connection details (host, port, username)
3. Click on a session to open it in a new tab
4. Enter your password when prompted
5. Enjoy your terminal!

## Project Structure

```
s_terminal/
├── backend/                  # Rust WebSocket SSH bridge
│   └── src/
│       ├── main.rs           # Entry point, WebSocket server
│       ├── message.rs        # WebSocket message protocol
│       ├── ssh.rs            # SSH connection management
│       └── ws_handler.rs     # WebSocket message routing
├── frontend/                 # React frontend
│   └── src/
│       ├── components/       # React components
│       │   ├── Terminal.tsx      # xterm.js terminal
│       │   ├── TabBar.tsx        # Tab bar
│       │   ├── SessionManager.tsx # Session sidebar
│       │   └── SessionForm.tsx   # Add/edit form
│       ├── hooks/            # Custom React hooks
│       │   ├── useSessions.ts    # localStorage persistence
│       │   └── useWebSocket.ts   # WebSocket connection
│       ├── types/            # TypeScript types
│       └── App.tsx            # Root component
└── docs/                     # Design documents
    └── superpowers/
        ├── specs/            # Design specifications
        └── plans/            # Implementation plans
```

## Configuration

### Backend Port

The backend runs on port **8081** by default. To change it, modify:

- `backend/src/main.rs` - `TcpListener::bind("0.0.0.0:8081")`
- `frontend/vite.config.ts` - proxy target

## Known Limitations

- Password is transmitted in the URL (MVP scope)
- No session configuration export/import
- No team collaboration features

## License

MIT
