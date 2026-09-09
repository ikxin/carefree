import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import * as schema from '#server/database/schema'
import { db } from '#server/utils/db'
import { getAvatarUrl } from '#server/utils/avatar'
import { betterAuth } from 'better-auth'
import { admin, customSession } from 'better-auth/plugins'
import { v7 as uuidv7 } from 'uuid'

const adminPlugin = admin()

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
  plugins: [
    adminPlugin,
    customSession(
      async ({ user, session }) => ({
        user: { ...user, image: getAvatarUrl(user.email) },
        session,
      }),
      { plugins: [adminPlugin] },
    ),
  ],
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
})
