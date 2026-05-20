export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    const me = await $fetch('/api/auth/me')
    if (!me || !me.authenticated) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
