export function useAuth() {
  const userId = ref<string | null>(null)
  const sessionId = ref<string | null>(null)

  async function login(user: string, pass: string) {
    const res = await $fetch<{ userId: string }>('/api/auth/login', {
      method: 'POST',
      body: { userId: user, password: pass },
    })
    userId.value = res.userId
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

  return { userId, sessionId, login, logout, updateSession }
}
