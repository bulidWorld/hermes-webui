import { getUserIdFromCookie } from '~/server/utils/user-store'
import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = await getUserIdFromCookie(event)

  const hermes = useHermesClient(event)
  const { data, status } = await hermes.listSessions({
    userId: userId || (query.user_id ? String(query.user_id) : undefined),
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  })
  setResponseStatus(event, status)

  const activeSessions = data?.data?.filter((s: any) => s.ended_at === null) || []
  const sessionId = activeSessions.length > 0 ? activeSessions[0].id : null
  return { ...data, userId, sessionId }
})
