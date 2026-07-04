import { prismaAdapter } from '@better-auth/prisma-adapter'
import { prisma } from '#server/utils/prisma'
import { betterAuth } from 'better-auth'
import { v7 as uuidv7 } from 'uuid'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
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
