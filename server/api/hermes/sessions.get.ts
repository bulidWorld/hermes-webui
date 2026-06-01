import { getUserIdFromCookie } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const query = getQuery(event)

  const userId = await getUserIdFromCookie(event)

  const params = new URLSearchParams()
  if (userId) params.set('user_id', userId)
  else if (query.user_id) params.set('user_id', String(query.user_id))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.offset) params.set('offset', String(query.offset))

  const headers: Record<string, string> = {}
  if (config.hermesApiKey) headers['Authorization'] = `Bearer ${config.hermesApiKey}`

  const url = `${config.hermesApiBase}/v1/sessions?${params.toString()}`
  logger.info('hermes request', { label: 'hermes', method: 'GET', url })

  try {
    const response = await fetch(url, { headers })

    const data = await response.json()
    if (!response.ok) {
      logger.error('hermes response error', { label: 'hermes', method: 'GET', url, status: response.status, body: data })
      setResponseStatus(event, response.status)
    } else {
      logger.info('hermes response ok', { label: 'hermes', method: 'GET', headers:headers, url, status: response.status , body: data })
    }
    const activeSessions = data?.data?.filter((s: any) => s.ended_at === null) || []
    const sessionId = activeSessions.length > 0 ? activeSessions[0].id : null
    return { ...data, userId, sessionId }
  } catch (err: any) {
    logger.error('hermes request failed', { label: 'hermes', method: 'GET', url, message: err.message })
    setResponseStatus(event, 502)
    return {
      error: { message: `Hermes API Server unreachable: ${err.message}`, type: 'server_error' },
    }
  }
})
