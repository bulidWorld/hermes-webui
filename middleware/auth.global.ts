export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    const data = await useRequestFetch()('/api/hermes/sessions?limit=1')
    if (!data || !data.userId) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
