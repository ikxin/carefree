import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient

export const useAuthClient = () => authClient

type AdminSession = typeof authClient.$Infer.Session

export const useAdminAuth = () => {
  const session = useState<AdminSession | null>('admin-session', () => null)
  const sessionError = useState('admin-session-error', () => '')
  const signingOut = useState('admin-signing-out', () => false)
  const sessionGeneration = useState('admin-session-generation', () => 0)
  const requestFetch = useRequestFetch()
  const hasAdminRole = (role: string | string[] | null | undefined) =>
    Array.isArray(role)
      ? role.includes('admin')
      : role?.split(',').some((item) => item.trim() === 'admin')
  const isAdmin = computed(() =>
    Boolean(
      session.value &&
      hasAdminRole(session.value.user.role) &&
      !session.value.user.banned &&
      new Date(session.value.session.expiresAt).getTime() > Date.now(),
    ),
  )

  const refreshSession = async () => {
    if (signingOut.value) return false
    const generation = sessionGeneration.value
    try {
      const latest = await requestFetch<AdminSession | null>('/api/auth/get-session', {
        query: { disableCookieCache: true },
      })
      if (generation !== sessionGeneration.value || signingOut.value) return false
      session.value =
        latest && new Date(latest.session.expiresAt).getTime() > Date.now() ? latest : null
      sessionError.value = ''
      return true
    } catch {
      if (generation !== sessionGeneration.value || signingOut.value) return false
      session.value = null
      sessionError.value = '暂时无法确认登录状态，请检查网络后重试。'
      return false
    }
  }

  const logout = async () => {
    if (signingOut.value) return false
    signingOut.value = true
    sessionGeneration.value++
    try {
      const { error } = await authClient.signOut()
      if (error) throw error
      sessionGeneration.value++
      session.value = null
      sessionError.value = ''
      return true
    } catch {
      sessionError.value = '退出登录失败，请检查网络后重试。'
      return false
    } finally {
      signingOut.value = false
    }
  }

  return { session, sessionError, signingOut, isAdmin, refreshSession, logout }
}
