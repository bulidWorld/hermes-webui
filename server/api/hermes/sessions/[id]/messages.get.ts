import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing session ID' } }
  }

  const headers: Record<string, string> = {}
  if (config.hermesApiKey) headers['Authorization'] = `Bearer ${config.hermesApiKey}`

  const url = `${config.hermesApiBase}/v1/sessions/${id}/messages`
  logger.info('hermes request', { label: 'hermes', method: 'GET',headers:headers, url })

  try {
    const response = await fetch(url, { headers })

    const data = await response.json()
    if (!response.ok) {
      logger.error('hermes response error', { label: 'hermes', method: 'GET',headers:headers, url, status: response.status, body: data })
      setResponseStatus(event, response.status)
    } else {
        logger.info('hermes response ok', { label: 'hermes', method: 'GET',headers:headers, url, status: response.status, body: data })

    }
    return data
  } catch (err: any) {
    logger.error('hermes request failed', { label: 'hermes', method: 'GET', url, message: err.message })
    setResponseStatus(event, 502)
    return {
      error: { message: `Hermes API Server unreachable: ${err.message}`, type: 'server_error' },
    }
  }
})
