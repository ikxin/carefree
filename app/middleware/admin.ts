export default defineNuxtRouteMiddleware(async (to) => {
  const { isAdmin, refreshSession } = useAdminAuth()
  await refreshSession()

  if (to.path.replace(/\/$/, '') === '/admin/login') {
    if (isAdmin.value) return navigateTo('/admin', { replace: true })
    return
  }

  if (!isAdmin.value) return navigateTo('/admin/login', { replace: true })
})
