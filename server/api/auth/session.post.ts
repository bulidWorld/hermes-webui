import { getUserIdFromCookie } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  const body = await readBody(event)
  logger.debug('session update', { label: 'session', userId, sessionId: body.sessionId })

  return { ok: true }
})
