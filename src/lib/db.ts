import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface OrchestriaDB extends DBSchema {
  sessions: {
    key: string
    value: {
      id: string
      title: string
      prompt: string
      models: string[]
      finalOutput: string
      status: 'running' | 'done' | 'error'
      createdAt: string
      tasks: Array<{
        id: string
        name: string
        ai: string
        status: string
        output?: string
        error?: string
      }>
    }
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<OrchestriaDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OrchestriaDB>('orchestria', 1, {
      upgrade(db) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-date', 'createdAt')
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    })
  }
  return dbPromise
}

export async function saveSession(session: OrchestriaDB['sessions']['value']) {
  // Save to IndexedDB always (local cache)
  const db = await getDB()
  await db.put('sessions', session)
  
  // Try saving to Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { supabase } = await import('./supabase')
      await supabase.from('sessions').upsert({
        id: session.id,
        title: session.title,
        prompt: session.prompt,
        models: session.models,
        final_output: session.finalOutput,
        status: session.status,
        created_at: session.createdAt,
        tasks: session.tasks
      })
    } catch {} // silently fail — local still works
  }
}

export async function getAllSessions(): Promise<OrchestriaDB['sessions']['value'][]> {
  // Try Supabase first for cloud data
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { supabase } = await import('./supabase')
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          title: row.title,
          prompt: row.prompt,
          models: row.models,
          finalOutput: row.final_output,
          status: row.status,
          createdAt: row.created_at,
          tasks: row.tasks || []
        })) as OrchestriaDB['sessions']['value'][]
      }
    } catch {}
  }
  // Fall back to IndexedDB
  const db = await getDB()
  const all = await db.getAllFromIndex('sessions', 'by-date')
  return all.reverse()
}

export async function getSessionById(id: string) {
  const db = await getDB()
  return db.get('sessions', id)
}

export async function deleteSession(id: string) {
  const db = await getDB()
  await db.delete('sessions', id)
}

export async function clearAllSessions() {
  const db = await getDB()
  await db.clear('sessions')
}

export async function saveSetting(key: string, value: unknown) {
  const db = await getDB()
  await db.put('settings', { key, value })
}

export async function getSetting(key: string) {
  const db = await getDB()
  const row = await db.get('settings', key)
  return row?.value
}
