import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession } = authClient

export const useAuthClient = () => authClient
