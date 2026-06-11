import { getUserIdFromCookie } from '~/server/utils/user-store'
import { useHermesClient } from '~/server/utils/hermes-client'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  const userId = await getUserIdFromCookie(event)
  const sessionId = body.session_id || null

  logger.info('create run', { label: 'run', userId, sessionId, inputLength: body.input?.length, model: body.model })

  // Build extra headers for session context
  const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionId) extraHeaders['X-Hermes-Session-Id'] = sessionId

  const sessionKey = userId ? `agent:main:webui:dm:${userId}` : (body.session_key || undefined)
  if (sessionKey) extraHeaders['X-Hermes-Session-Key'] = sessionKey

  // Per-request API key override takes precedence over config default
  const apiKey = body.api_key || config.hermesApiKey
  if (apiKey) extraHeaders['Authorization'] = `Bearer ${apiKey}`

  // Build forwarded request body
  const forwardedBody: Record<string, any> = {
    input: body.input,
    instructions: body.instructions,
    model: body.model,
    user_id: userId || body.user_id,
  }
  if (sessionId) forwardedBody.session_id = sessionId
  if (body.attachments) forwardedBody.attachments = body.attachments

  const hermes = useHermesClient(event)
  const { data, status, headers } = await hermes.createRun(forwardedBody, extraHeaders)
  setResponseStatus(event, status)

  if (status >= 400) {
    logger.warn('create run: upstream error', { label: 'run', userId, sessionId, status, body: JSON.stringify(data).slice(0, 500) })
  } else {
    logger.info('create run: ok', { label: 'run', runId: data?.run_id, sessionId })
  }

  // Forward session response headers back to client
  const resHeaders: Record<string, string> = {}
  const sid = headers.get('X-Hermes-Session-Id')
  if (sid) resHeaders['X-Hermes-Session-Id'] = sid
  const sk = headers.get('X-Hermes-Session-Key')
  if (sk) resHeaders['X-Hermes-Session-Key'] = sk
  setResponseHeaders(event, resHeaders)

  return data
})
