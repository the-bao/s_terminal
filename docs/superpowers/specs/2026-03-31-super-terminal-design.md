# 超级终端 (Super Terminal) 设计文档

## 概述

超级终端是一个基于 Web 的 SSH 会话管理工具，支持多 Tab 会话管理，让用户可以通过浏览器在 iPad 等设备上方便地管理多个 SSH 连接。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + xterm.js + WebSocket |
| 后端 | Rust + tokio + ssh2 + tokio-tungstenite |
| 存储 | 浏览器 localStorage（会话配置本地保存）|

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      iPad 浏览器                          │
│  ┌──────────┐  ┌──────────────────────────────────────┐ │
│  │ 会话管理  │  │           xterm.js 终端              │ │
│  │ (Tab列表) │  │                                      │ │
│  └──────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              │ WebSocket (ws://host:8080/ssh/{session_id})
              ▼
┌─────────────────────────────────────────────────────────┐
│                   Rust WebSocket 服务器                  │
│  - 维护 SSH 连接池                                       │
│  - 透传 terminal 输入/输出                              │
│  - 支持多个并发会话                                      │
└─────────────────────────────────────────────────────────┘
              │ SSH (port 22)
              ▼
┌─────────────────────────────────────────────────────────┐
│                   远程 SSH 服务器                         │
└─────────────────────────────────────────────────────────┘
```

## 功能范围 (MVP)

### 会话管理
- 添加 SSH 连接（主机、端口、用户名、标签）
- 编辑已有连接配置
- 删除连接
- 连接配置保存到浏览器 localStorage

### 多 Tab 支持
- 同时打开多个 SSH 会话
- Tab 栏显示所有打开的会话
- 点击 Tab 切换会话
- 关闭 Tab（断开对应 SSH 连接）

### 终端操作
- 基本的终端输入输出
- 复制粘贴支持
- 终端滚动查看历史输出

## 数据模型

### Session 配置（存储在 localStorage）

```typescript
interface Session {
  id: string;           // UUID
  name: string;         // 标签名称
  host: string;         // SSH 主机
  port: number;         // SSH 端口，默认 22
  username: string;     // 用户名
  createdAt: number;    // 创建时间戳
}
```

### WebSocket 消息协议

```typescript
// 客户端 → 服务端
type ClientMessage =
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'input'; data: string }
  | { type: 'ping' }

// 服务端 → 客户端
type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'pong' }
  | { type: 'error'; message: string }
```

## 目录结构

```
s_terminal/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── SessionManager.tsx   # 左侧会话管理
│   │   │   ├── TabBar.tsx           # Tab 栏
│   │   │   ├── Terminal.tsx         # 终端组件
│   │   │   └── SessionForm.tsx      # 添加/编辑会话表单
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts       # WebSocket 连接管理
│   │   │   └── useSessions.ts        # 会话存储管理
│   │   ├── types/
│   │   │   └── session.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── backend/          # Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口，WebSocket 服务器
│   │   ├── message.rs           # 消息协议定义
│   │   └── ssh.rs               # SSH 连接管理
│   └── Cargo.toml
└── docs/            # 设计文档
```

## 后端 API

### WebSocket 端点

`GET /ssh/{host}/{port}/{username}/{password}`

- path params: SSH 连接参数（密码在 URL 路径中传输）
- 服务端建立 SSH 连接后，透传所有输入输出

### 连接流程

1. 浏览器连接 WebSocket `/ssh/uuid?host=...&port=...&username=...`
2. 后端解析参数，建立 SSH 连接
3. SSH 连接成功后，返回 success 消息
4. 之后所有 terminal 输入/输出透传

## 前端组件设计

### App
- 根组件，管理全局状态
- 维护 Tab 列表和当前激活 Tab

### SessionManager
- 左侧面板（或抽屉）
- 显示已保存的会话列表
- 添加/编辑/删除按钮

### TabBar
- 顶部 Tab 栏
- 每个 Tab 显示会话名称
- 关闭按钮

### Terminal
- xterm.js 渲染终端
- 连接对应的 WebSocket
- 处理 resize 事件

## iPad 触控优化

- 触控友好的按钮尺寸（最小 44x44）
- 侧滑返回支持
- 大触摸区域

## MVP 不包含

- 密码/密钥保存
- 配置导入/导出
- 团队协作/配置同步
- 分屏视图

## 下一步

实现阶段按照 writing-plans skill 生成详细实施计划。
