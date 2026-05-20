import { getUserIdFromCookie, saveSessionId } from '~/server/utils/user-store'

export default defineEventHandler(async (event) => {
  const userId = getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  const body = await readBody(event)
  const sessionId = body.sessionId
  if (sessionId) {
    saveSessionId(userId, sessionId)
  }

  return { ok: true }
})
