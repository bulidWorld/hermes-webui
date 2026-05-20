import { getUserIdFromCookie, getSessionId } from '~/server/utils/user-store'

export default defineEventHandler(async (event) => {
  const userId = getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { authenticated: false }
  }

  return {
    authenticated: true,
    userId,
    sessionId: getSessionId(userId),
  }
})
