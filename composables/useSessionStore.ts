// Persistent session_id in localStorage for conversation continuity.

const STORAGE_KEY = 'hermes-session-id'

export function useSessionStore() {
  const sessionId = ref<string | null>(null)

  function load() {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      sessionId.value = stored || null
    }
  }

  function save(id: string) {
    sessionId.value = id
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }

  function clear() {
    sessionId.value = null
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { sessionId, load, save, clear }
}
