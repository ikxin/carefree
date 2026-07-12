import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import * as schema from '#server/database/schema'
import { db } from '#server/utils/db'
import { betterAuth } from 'better-auth'
import { v7 as uuidv7 } from 'uuid'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
})
