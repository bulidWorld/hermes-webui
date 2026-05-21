import { getUserIdFromCookie, getSessionId } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { authenticated: false }
  }

  logger.debug('auth check', { label: 'auth', userId })

  return {
    authenticated: true,
    userId,
    sessionId: getSessionId(userId),
  }
})
