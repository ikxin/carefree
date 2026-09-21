import * as schema from '#server/database/schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const globalForDb = globalThis as typeof globalThis & {
  postgresPool?: Pool
}

const pool = globalForDb.postgresPool ?? new Pool({ connectionString: databaseUrl })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresPool = pool
}

export const db = drizzle(pool, { schema })

export async function withDatabaseAdvisoryLock<T>(
  lockKey: number,
  callback: () => Promise<T>,
): Promise<T | undefined> {
  const client = await pool.connect()

  try {
    const result = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [lockKey],
    )

    if (!result.rows[0]?.locked) {
      return undefined
    }

    try {
      return await callback()
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch((error: unknown) => {
        console.error('释放数据库备份锁时发生错误：', error)
      })
    }
  } finally {
    client.release()
  }
}
