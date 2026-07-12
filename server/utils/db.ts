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
