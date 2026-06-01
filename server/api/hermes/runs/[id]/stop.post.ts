import { logger } from '~/server/utils/logger'

// POST /api/hermes/runs/:id/stop → Hermes :8642 /v1/runs/:id/stop
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const id = getRouterParam(event, 'id')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.hermesApiKey) headers['Authorization'] = `Bearer ${config.hermesApiKey}`

  const url = `${config.hermesApiBase}/v1/runs/${id}/stop`
  logger.info('hermes request', { label: 'hermes', method: 'POST', url })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })

    const data = await response.json()
    if (!response.ok) {
      logger.error('hermes response error', { label: 'hermes', method: 'POST', url, status: response.status, body: data })
      setResponseStatus(event, response.status)
    } else {
      logger.info('hermes response ok', { label: 'hermes', method: 'POST', url, status: response.status })
    }
    return data
  } catch (err: any) {
    logger.error('hermes request failed', { label: 'hermes', method: 'POST', url, message: err.message })
    setResponseStatus(event, 502)
    return {
      error: { message: `服务不可用，请联系管理员: ${err.message}` },
    }
  }
})
