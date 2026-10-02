import { randomUUID } from 'node:crypto'
import { SCHEMA } from './schema'
import { FEEDS } from '../config'

// Postgres when DATABASE_URL is set (production: Neon via Vercel), otherwise an
// embedded PGlite database on disk so the pipeline runs locally with no setup.

export type Row = Record<string, any>
export type Query = (sql: string, params?: unknown[]) => Promise<Row[]>

type Driver = {
  query: Query
  exec: (sql: string) => Promise<void>
  transaction: <T>(fn: (q: Query) => Promise<T>) => Promise<T>
}

const globalForDb = globalThis as unknown as { abriDb?: Promise<Driver> }

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL
  if (url) {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: url, max: 5 })
    return {
      query: async (sql, params) => (await pool.query(sql, params as any[])).rows,
      exec: async (sql) => void (await pool.query(sql)),
      transaction: async (fn) => {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const result = await fn(async (sql, params) => (await client.query(sql, params as any[])).rows)
          await client.query('COMMIT')
          return result
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      },
    }
  }

  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set')
  const { PGlite } = await import('@electric-sql/pglite')
  const dir = process.env.PGLITE_DIR || '.data/pglite'
  ;(await import('node:fs')).mkdirSync(dir, { recursive: true })
  const db = new PGlite(dir)
  return {
    query: async (sql, params) => (await db.query<Row>(sql, params as any[])).rows,
    exec: async (sql) => void (await db.exec(sql)),
    transaction: (fn) =>
      db.transaction((tx) => fn(async (sql, params) => (await tx.query<Row>(sql, params as any[])).rows)) as Promise<any>,
  }
}

async function init(): Promise<Driver> {
  const driver = await createDriver()
  await driver.exec(SCHEMA)
  for (const f of FEEDS) {
    await driver.query(
      `INSERT INTO news_sources (id, name, domain, tier, rss_url) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $2, domain = $3, tier = $4, rss_url = $5, updated_at = now()`,
      [f.id, f.name, f.domain, f.tier, f.rssUrl]
    )
  }
  return driver
}

function driver(): Promise<Driver> {
  if (!globalForDb.abriDb) {
    globalForDb.abriDb = init().catch((err) => {
      globalForDb.abriDb = undefined
      throw err
    })
  }
  return globalForDb.abriDb
}

export const query: Query = async (sql, params) => (await driver()).query(sql, params)

export async function transaction<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  return (await driver()).transaction(fn)
}

export const newId = () => randomUUID()
