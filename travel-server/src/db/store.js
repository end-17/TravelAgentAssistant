// 会话存储：better-sqlite3 本地持久化，key 为 sessionId
// sessions 表记录会话，messages 表记录每条消息，按 session_id 关联
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(path.join(dataDir, 'travel.db'))
// WAL 模式：读写不互斥，并发性能更好
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
`)

const insertSession = db.prepare('INSERT INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)')
const selectSession = db.prepare('SELECT id FROM sessions WHERE id = ?')
const insertMessage = db.prepare('INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)')
const touchSession = db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?')
const selectAllMessages = db.prepare('SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY id ASC')
// 滑动窗口：取最近 N 条，子查询倒序取完再正序返回
const selectRecentMessages = db.prepare(`
  SELECT role, content FROM (
    SELECT role, content, id FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?
  ) ORDER BY id ASC
`)

export const sessionStore = {
  // 校验传入的 sessionId 是否存在，不存在（或没传）则创建新会话
  ensureSession(sessionId) {
    if (sessionId && selectSession.get(sessionId)) {
      return sessionId
    }
    const id = randomUUID()
    const now = Date.now()
    insertSession.run(id, now, now)
    return id
  },
  // 追加一条消息并更新会话时间
  appendMessage(sessionId, role, content) {
    insertMessage.run(sessionId, role, content, Date.now())
    touchSession.run(Date.now(), sessionId)
  },
  // 取最近 limit 条作为模型上下文（滑动窗口，防止 token 爆炸）
  getContextMessages(sessionId, limit = 20) {
    return selectRecentMessages.all(sessionId, limit)
  },
  // 取全部消息，用于前端刷新后恢复会话
  getAllMessages(sessionId) {
    return selectAllMessages.all(sessionId)
  }
}
