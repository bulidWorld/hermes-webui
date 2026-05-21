import { getUserIdFromCookie, saveSessionId } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  const body = await readBody(event)
  const sessionId = body.sessionId
  if (sessionId) {
    saveSessionId(userId, sessionId)
  } else {
    logger.debug('session post without sessionId', { label: 'session', userId })
  }

  return { ok: true }
})
