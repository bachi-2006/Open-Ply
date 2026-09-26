import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'
import { randomBytes } from 'crypto'
import { Message } from '@openply/core'

const DB_DIR = join(homedir(), '.openply')
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true })

const db = new Database(join(DB_DIR, 'history.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    label TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
`)

function generateId(): string {
  return randomBytes(8).toString('hex')
}

export function createSession(label?: string): string {
  const id = generateId()
  const now = Date.now()
  db.prepare('INSERT INTO sessions (id, created_at, updated_at, label) VALUES (?, ?, ?, ?)').run(id, now, now, label || null)
  return id
}

export function getSessions(limit = 20): { id: string; label: string | null; createdAt: number }[] {
  return db.prepare('SELECT id, label, created_at FROM sessions ORDER BY created_at DESC LIMIT ?').all(limit) as any
}

export function addMessage(sessionId: string, msg: Message): void {
  db.prepare('INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)').run(
    sessionId, msg.role, msg.content, msg.timestamp
  )
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(Date.now(), sessionId)
}

export function getMessages(sessionId: string): Message[] {
  return db.prepare('SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id').all(sessionId) as Message[]
}

export function getSession(sessionId: string): { id: string; label: string | null; createdAt: number; messages: Message[] } | null {
  const session = db.prepare('SELECT id, label, created_at FROM sessions WHERE id = ?').get(sessionId) as any
  if (!session) return null
  return {
    ...session,
    createdAt: session.created_at,
    messages: getMessages(sessionId),
  }
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

export function searchSessions(query: string): { id: string; label: string | null; createdAt: number }[] {
  return db.prepare(
    `SELECT s.id, s.label, s.created_at FROM sessions s
     JOIN messages m ON s.id = m.session_id
     WHERE m.content LIKE ?
     GROUP BY s.id
     ORDER BY s.created_at DESC LIMIT 20`
  ).all(`%${query}%`) as any
}
