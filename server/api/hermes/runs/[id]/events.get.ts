import { logger } from '~/server/utils/logger'

// GET /api/hermes/runs/:id/events → Hermes :8642 SSE stream (raw pass-through)
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing run ID' } }
  }

  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  if (config.hermesApiKey) headers['Authorization'] = `Bearer ${config.hermesApiKey}`

  const url = `${config.hermesApiBase}/v1/runs/${id}/events`
  logger.info('hermes request', { label: 'hermes', method: 'GET', url, type: 'sse' })

  try {
    const response = await fetch(url, { headers })

    if (!response.ok || !response.body) {
      logger.error('hermes response error', { label: 'hermes', method: 'GET', url, status: response.status, type: 'sse' })
      setResponseStatus(event, response.status || 502)
      return { error: { message: `Failed to connect to event stream: ${response.statusText}` } }
    }

    logger.info('hermes sse stream opened', { label: 'hermes', method: 'GET', url, status: response.status })

    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    })

    return sendStream(event, response.body)
  } catch (err: any) {
    logger.error('hermes request failed', { label: 'hermes', method: 'GET', url, message: err.message, type: 'sse' })
    setResponseStatus(event, 502)
    return { error: { message: `服务不可用，请联系管理员: ${err.message}` } }
  }
})
