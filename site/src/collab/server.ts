// WebSocket server for collaborative editing
// Multi-user sessions with cursor presence and operational transform

import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import * as crypto from 'crypto'
import process from 'process'

const ROOT = resolve(process.env.OPENPLY_ROOT || process.cwd(), '..')

// --- Types ---

interface Cursor {
  userId: string
  userName: string
  file: string
  line: number
  column: number
  color: string
}

interface Operation {
  type: 'insert' | 'delete' | 'replace'
  position: number
  content?: string
  length?: number
  userId: string
  timestamp: number
}

interface Session {
  id: string
  users: Map<string, UserConnection>
  fileContents: Map<string, string>
  operations: Map<string, Operation[]>
  cursors: Map<string, Cursor>
  createdAt: number
}

interface UserConnection {
  ws: WebSocket
  userId: string
  userName: string
  color: string
  sessionId: string
}

// --- State ---

const sessions = new Map<string, Session>()
const connections = new Map<WebSocket, UserConnection>()
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
]

// --- Session Management ---

function createSession(): string {
  const id = crypto.randomBytes(8).toString('hex')
  sessions.set(id, {
    id,
    users: new Map(),
    fileContents: new Map(),
    operations: new Map(),
    cursors: new Map(),
    createdAt: Date.now(),
  })
  return id
}

function getOrCreateSession(sessionId: string): Session {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      users: new Map(),
      fileContents: new Map(),
      operations: new Map(),
      cursors: new Map(),
      createdAt: Date.now(),
    })
  }
  return sessions.get(sessionId)!
}

function joinSession(session: Session, conn: UserConnection) {
  session.users.set(conn.userId, conn)

  // Send current file contents
  for (const [file, content] of session.fileContents) {
    send(conn.ws, {
      type: 'file:content',
      file,
      content,
    })
  }

  // Send current cursors
  for (const [userId, cursor] of session.cursors) {
    if (userId !== conn.userId) {
      send(conn.ws, {
        type: 'cursor:update',
        ...cursor,
      })
    }
  }

  // Broadcast user joined
  broadcast(session, {
    type: 'user:joined',
    userId: conn.userId,
    userName: conn.userName,
    color: conn.color,
    userCount: session.users.size,
  }, conn.userId)
}

function leaveSession(conn: UserConnection) {
  const session = sessions.get(conn.sessionId)
  if (!session) return

  session.users.delete(conn.userId)
  session.cursors.delete(conn.userId)

  // Broadcast user left
  broadcast(session, {
    type: 'user:left',
    userId: conn.userId,
    userCount: session.users.size,
  })

  // Clean up empty sessions
  if (session.users.size === 0) {
    sessions.delete(session.id)
  }
}

// --- Operation Handling ---

function handleOperation(session: Session, conn: UserConnection, op: Operation) {
  const file = (op as any).file || 'unknown'
  let content = session.fileContents.get(file) || ''

  // Apply operation (simple OT)
  switch (op.type) {
    case 'insert':
      content = content.slice(0, op.position) + (op.content || '') + content.slice(op.position)
      break
    case 'delete':
      content = content.slice(0, op.position) + content.slice(op.position + (op.length || 0))
      break
    case 'replace':
      content = content.slice(0, op.position) + (op.content || '') + content.slice(op.position + (op.length || 0))
      break
  }

  session.fileContents.set(file, content)

  // Store operation
  const ops = session.operations.get(file) || []
  ops.push(op)
  session.operations.set(file, ops)

  // Broadcast to other users
  broadcast(session, {
    ...op,
    file,
  }, conn.userId)
}

function handleCursor(session: Session, conn: UserConnection, cursor: Cursor) {
  session.cursors.set(conn.userId, { ...cursor, userId: conn.userId })

  broadcast(session, {
    type: 'cursor:update',
    ...cursor,
    userId: conn.userId,
  }, conn.userId)
}

function handleFileOpen(session: Session, conn: UserConnection, file: string) {
  const fullPath = resolve(ROOT, file)

  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf-8')
    session.fileContents.set(file, content)
    send(conn.ws, { type: 'file:content', file, content })
  }
}

function handleFileSave(session: Session, conn: UserConnection, file: string) {
  const content = session.fileContents.get(file)
  if (content === undefined) return

  const fullPath = resolve(ROOT, file)
  writeFileSync(fullPath, content, 'utf-8')

  broadcast(session, {
    type: 'file:saved',
    file,
    savedBy: conn.userName,
  })
}

// --- WebSocket Handling ---

function send(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

function broadcast(session: Session, data: any, excludeUserId?: string) {
  for (const [userId, conn] of session.users) {
    if (userId !== excludeUserId) {
      send(conn.ws, data)
    }
  }
}

function handleMessage(conn: UserConnection, data: string) {
  let msg: any
  try {
    msg = JSON.parse(data)
  } catch {
    return
  }

  const session = sessions.get(conn.sessionId)
  if (!session) return

  switch (msg.type) {
    case 'join': {
      const sessionToJoin = getOrCreateSession(msg.sessionId || createSession())
      conn.sessionId = sessionToJoin.id
      joinSession(sessionToJoin, conn)
      send(conn.ws, { type: 'session:joined', sessionId: sessionToJoin.id })
      break
    }
    case 'operation':
      handleOperation(session, conn, {
        ...msg,
        userId: conn.userId,
        timestamp: Date.now(),
      })
      break
    case 'cursor':
      handleCursor(session, conn, {
        userId: conn.userId,
        userName: conn.userName,
        file: msg.file,
        line: msg.line,
        column: msg.column,
        color: conn.color,
      })
      break
    case 'file:open':
      handleFileOpen(session, conn, msg.file)
      break
    case 'file:save':
      handleFileSave(session, conn, msg.file)
      break
    case 'chat':
      broadcast(session, {
        type: 'chat',
        userId: conn.userId,
        userName: conn.userName,
        content: msg.content,
        timestamp: Date.now(),
      })
      break
    case 'ping':
      send(conn.ws, { type: 'pong' })
      break
  }
}

// --- Server Setup ---

export function startCollabServer(port: number = 3002) {
  const server = createServer()
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket) => {
    const userId = crypto.randomBytes(8).toString('hex')
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]

    const conn: UserConnection = {
      ws,
      userId,
      userName: `User ${userId.slice(0, 4)}`,
      color,
      sessionId: '',
    }

    connections.set(ws, conn)

    send(ws, { type: 'connected', userId, color })

    ws.on('message', (data: Buffer) => {
      handleMessage(conn, data.toString())
    })

    ws.on('close', () => {
      leaveSession(conn)
      connections.delete(ws)
    })

    ws.on('error', () => {
      leaveSession(conn)
      connections.delete(ws)
    })
  })

  server.listen(port, () => {
    console.log(`openPly collab server running on ws://localhost:${port}`)
  })

  return { server, wss }
}

// Start if run directly
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  startCollabServer()
}
