export function useAuth() {
  const userId = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const loaded = ref(false)

  async function fetchMe() {
    try {
      const me = await $fetch<{ authenticated: boolean; userId: string; sessionId: string | null }>('/api/auth/me')
      if (me.authenticated) {
        userId.value = me.userId
        sessionId.value = me.sessionId
      }
    } catch { /* not logged in */ }
    loaded.value = true
  }

  async function login(user: string, pass: string) {
    const res = await $fetch<{ userId: string; sessionId: string | null }>('/api/auth/login', {
      method: 'POST',
      body: { userId: user, password: pass },
    })
    userId.value = res.userId
    sessionId.value = res.sessionId
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    userId.value = null
    sessionId.value = null
    await navigateTo('/login')
  }

  async function updateSession(id: string) {
    sessionId.value = id
    await $fetch('/api/auth/session', {
      method: 'POST',
      body: { sessionId: id },
    })
  }

  return { userId, sessionId, loaded, fetchMe, login, logout, updateSession }
}
