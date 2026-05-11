export type TaskStatus = 'pending' | 'running' | 'done' | 'error'

export interface Task {
  id: string
  name: string
  ai: string
  status: TaskStatus
  output?: string
  error?: string
}

export interface Session {
  id: string
  prompt: string
  models: string[]
  tasks: Task[]
  finalOutput?: string
  createdAt: Date
  status: 'running' | 'done' | 'error'
}

declare global {
  // eslint-disable-next-line no-var
  var __orchestria_sessions: Map<string, Session> | undefined
}

const sessions: Map<string, Session> =
  globalThis.__orchestria_sessions ??
  (globalThis.__orchestria_sessions = new Map())

const TASK_NAMES: Record<number, Record<number, string>> = {}

function getTaskName(index: number, total: number): string {
  if (total === 1) return 'Generate Response'
  if (index === 0) return 'Research & Context'
  if (index === total - 1) return 'Synthesize & Format'
  return 'Generate Content'
}

export function createSession(id: string, prompt: string, models: string[]): Session {
  const session: Session = {
    id,
    prompt,
    models,
    tasks: models.map((ai, i) => ({
      id: `task-${i}`,
      name: getTaskName(i, models.length),
      ai,
      status: 'pending',
    })),
    createdAt: new Date(),
    status: 'running',
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function updateTask(sessionId: string, taskId: string, update: Partial<Task>) {
  const session = sessions.get(sessionId)
  if (!session) return
  const task = session.tasks.find(t => t.id === taskId)
  if (task) Object.assign(task, update)
}

export function updateSession(sessionId: string, update: Partial<Session>) {
  const session = sessions.get(sessionId)
  if (session) Object.assign(session, update)
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}
