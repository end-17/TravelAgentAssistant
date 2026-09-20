# 旅游 Agent 助手（TravelAgentAssistant）

一个基于大模型的智能旅游规划助手，包含移动端 H5 前端和 Node.js 后端。支持流式对话、Agent 工具调用、行程规划生成和多轮会话持久化。

## 功能特性

- **智能对话**：SSE 流式输出，打字机效果实时展示
- **Agent 工具调用**：基于 OpenAI Agents SDK 的 ReAct 循环，自动调用天气查询、景点搜索工具
- **行程规划**：根据目的地、预算、天数生成结构化 JSON 行程（每日安排 + 预算明细 + 注意事项）
- **多轮会话**：SQLite 持久化会话历史，滑动窗口控制上下文长度，刷新页面可恢复对话
- **多模型切换**：支持 DeepSeek / 硅基流动（SiliconFlow），通过环境变量一键切换

## 技术栈

**前端 travel-h5**

- Vue 3 + Vite
- Vant 4（移动端 UI 组件库）
- Vue Router + Axios

**后端 travel-server**

- Node.js + Express
- LangChain（ChatOpenAI 流式调用）
- OpenAI Agents SDK（Agent + 工具调用，zod 定义工具 schema）
- better-sqlite3（会话持久化）

## 项目结构

```
├── travel-h5/                # 移动端 H5 前端
│   ├── src/
│   │   ├── views/            # 页面：首页、对话页、详情页、我的
│   │   ├── components/       # 组件：聊天气泡、景点卡片、预算表格
│   │   ├── router/           # 路由配置
│   │   └── utils/            # axios 请求封装
│   └── vite.config.js
│
└── travel-server/            # 后端服务
    └── src/
        ├── index.js          # Express 入口
        ├── router/           # 接口路由
        ├── servers/          # LLM 服务、Agent 工具定义
        ├── db/               # SQLite 会话存储
        └── utils/            # SSE 流式工具
```

## 快速开始

**环境要求**：Node.js >= 20

### 1. 安装依赖

```bash
cd travel-server && npm install
cd ../travel-h5 && npm install
```

### 2. 配置环境变量

在 `travel-server/` 目录下创建 `.env` 文件：

```env
PORT=3001

# 模型供应商：DEEPSEEK 或 SILICONFLOW
MODEL_PROVIDER=DEEPSEEK

# DeepSeek 配置
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 硅基流动配置
SILICONFLOW_API_KEY=你的API密钥
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen3.6-35B-A3B
```

### 3. 启动服务

```bash
# 启动后端（端口 3001）
cd travel-server && npm run dev

# 启动前端
cd travel-h5 && npm run dev
```

## API 接口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/travel/recommend` | POST | 生成结构化行程规划（城市、预算、天数 → JSON 行程单） |
| `/api/travel/chat` | POST | 普通流式对话（SSE） |
| `/api/travel/agent-chat` | POST | Agent 流式对话，自动调用工具，SSE 推送文本 + 工具调用状态 |
| `/api/travel/history` | GET | 按 sessionId 查询会话历史，用于刷新后恢复 |

## 核心实现

- **SSE 流式输出**：后端逐 chunk 推送模型输出，前端实时渲染，工具调用时额外推送 `tool` 帧展示「正在查询天气...」等状态
- **Agent ReAct 循环**：模型自主判断何时调用工具，SDK 自动执行工具并将结果回注上下文，最多 5 轮迭代
- **滑动窗口上下文**：每轮对话只携带最近 20 条历史消息，防止 token 超限；完整历史存 SQLite，支持刷新恢复
