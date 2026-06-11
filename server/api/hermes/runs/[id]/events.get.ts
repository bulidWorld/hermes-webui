import { useHermesClient } from '~/server/utils/hermes-client'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing run ID' } }
  }

  logger.info('SSE stream request', { label: 'sse', runId: id })

  const hermes = useHermesClient(event)
  const result = await hermes.getRunEvents(id)

  if (!result.ok || !result.response?.body) {
    logger.warn('SSE stream: upstream unavailable', { label: 'sse', runId: id, status: result.status, data: result.data })
    setResponseStatus(event, result.status)
    return result.data
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
    'Connection': 'keep-alive',
  })

  return sendStream(event, result.response.body)
})
