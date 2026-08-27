import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient

export const useAuthClient = () => authClient
