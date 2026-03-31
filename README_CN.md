# 超级终端 (Super Terminal)

一款基于 Web 的 SSH 会话管理器，支持多 Tab，适合 iPad 浏览器使用。

## 功能特点

- **多 Tab SSH 会话** - 在不同 Tab 中打开多个 SSH 连接
- **会话管理** - 保存和组织 SSH 连接配置
- **iPad 优化** - 触控友好的界面，合适的触摸目标大小
- **Web 应用** - 任意浏览器均可访问

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + xterm.js |
| 后端 | Rust + tokio + ssh2 + tokio-tungstenite |
| 存储 | 浏览器 localStorage |

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      浏览器                               │
│  ┌──────────┐  ┌──────────────────────────────────────┐ │
│  │ 会话管理  │  │           xterm.js 终端              │ │
│  │ (侧边栏) │  │                                      │ │
│  └──────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              │ WebSocket (ws://host:8081/ssh/...)
              ▼
┌─────────────────────────────────────────────────────────┐
│              Rust WebSocket 服务器                        │
│  - 维护 SSH 连接池                                       │
│  - 透传终端输入/输出                                     │
└─────────────────────────────────────────────────────────┘
              │ SSH (port 22)
              ▼
┌─────────────────────────────────────────────────────────┐
│                   远程 SSH 服务器                         │
└─────────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Rust (最新稳定版)
- Node.js 18+
- npm 或 yarn

### 后端启动

```bash
cd backend
cargo run
```

后端服务将运行在 `ws://0.0.0.0:8081`。

### 前端启动

```bash
cd frontend
npm install
npm run dev -- --host
```

访问 `http://localhost:3000` 即可使用。

### 使用方法

1. 点击侧边栏的 **+ Add** 创建新会话
2. 填写连接信息（主机、端口、用户名）
3. 点击会话在新 Tab 中打开
4. 输入密码进行连接
5. 开始使用终端！

## 项目结构

```
s_terminal/
├── backend/                  # Rust WebSocket SSH 桥接
│   └── src/
│       ├── main.rs           # 入口，WebSocket 服务器
│       ├── message.rs        # WebSocket 消息协议
│       ├── ssh.rs            # SSH 连接管理
│       └── ws_handler.rs     # WebSocket 消息路由
├── frontend/                 # React 前端
│   └── src/
│       ├── components/       # React 组件
│       │   ├── Terminal.tsx      # xterm.js 终端
│       │   ├── TabBar.tsx        # Tab 栏
│       │   ├── SessionManager.tsx # 会话管理侧边栏
│       │   └── SessionForm.tsx   # 添加/编辑表单
│       ├── hooks/            # 自定义 React Hooks
│       │   ├── useSessions.ts    # localStorage 持久化
│       │   └── useWebSocket.ts   # WebSocket 连接
│       ├── types/            # TypeScript 类型定义
│       └── App.tsx            # 根组件
└── docs/                     # 设计文档
    └── superpowers/
        ├── specs/            # 设计规范
        └── plans/            # 实施计划
```

## 配置说明

### 后端端口

后端默认运行在端口 **8081**。如需修改，请同时更改：

- `backend/src/main.rs` - `TcpListener::bind("0.0.0.0:8081")`
- `frontend/vite.config.ts` - proxy target

## 已知限制

- 密码通过 URL 传输（MVP 范围）
- 不支持会话配置导入/导出
- 不支持团队协作功能

## License

MIT
