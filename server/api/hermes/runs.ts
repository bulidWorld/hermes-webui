// POST /api/hermes/runs → Hermes :8642 /v1/runs
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  const sessionId = getHeader(event, 'x-hermes-session-id')
  const sessionKey = getHeader(event, 'x-hermes-session-key')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionId) headers['X-Hermes-Session-Id'] = sessionId
  if (sessionKey) headers['X-Hermes-Session-Key'] = sessionKey

  // Auto-inject API key from server config (or from client request body)
  const apiKey = body.api_key || config.hermesApiKey
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  try {
    const response = await fetch(`${config.hermesApiBase}/v1/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const resHeaders: Record<string, string> = {}
    const sid = response.headers.get('X-Hermes-Session-Id')
    if (sid) resHeaders['X-Hermes-Session-Id'] = sid
    const sk = response.headers.get('X-Hermes-Session-Key')
    if (sk) resHeaders['X-Hermes-Session-Key'] = sk

    const data = await response.json()
    if (!response.ok) {
      setResponseStatus(event, response.status)
    }
    setResponseHeaders(event, resHeaders)
    return data
  } catch (err: any) {
    setResponseStatus(event, 502)
    return {
      error: { message: `服务不可用，请联系管理员: ${err.message}`, type: 'server_error' },
    }
  }
})
