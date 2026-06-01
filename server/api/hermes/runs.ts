import { getUserIdFromCookie } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  const userId = await getUserIdFromCookie(event)
  const sessionId = body.session_id || null

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionId) headers['X-Hermes-Session-Id'] = sessionId

  // Build gateway_session_key for per-user memory scoping
  const sessionKey = userId ? `agent:main:webui:dm:${userId}` : (body.session_key || undefined)
  if (sessionKey) headers['X-Hermes-Session-Key'] = sessionKey

  const apiKey = body.api_key || config.hermesApiKey
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  // Build forwarded request body
  const forwardedBody: Record<string, any> = {
    input: body.input,
    instructions: body.instructions,
    model: body.model,
    user_id: userId || body.user_id,
  }
  if (sessionId) {
    forwardedBody.session_id = sessionId
  }

  const url = `${config.hermesApiBase}/v1/runs`
  logger.info('hermes request', { label: 'hermes', method: 'POST', url, body: forwardedBody })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardedBody),
    })

    const resHeaders: Record<string, string> = {}
    const sid = response.headers.get('X-Hermes-Session-Id')
    if (sid) resHeaders['X-Hermes-Session-Id'] = sid
    const sk = response.headers.get('X-Hermes-Session-Key')
    if (sk) resHeaders['X-Hermes-Session-Key'] = sk

    const data = await response.json()
    if (!response.ok) {
      logger.error('hermes response error', { label: 'hermes', method: 'POST', url, status: response.status, body: data })
      setResponseStatus(event, response.status)
    } else {
      logger.info('hermes response ok', { label: 'hermes', method: 'POST', url, status: response.status })
    }
    setResponseHeaders(event, resHeaders)
    return data
  } catch (err: any) {
    logger.error('hermes request failed', { label: 'hermes', method: 'POST', url, message: err.message })
    setResponseStatus(event, 502)
    return {
      error: { message: `Hermes API Server unreachable: ${err.message}`, type: 'server_error' },
    }
  }
})
