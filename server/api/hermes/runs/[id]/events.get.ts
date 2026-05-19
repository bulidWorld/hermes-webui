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

  try {
    const response = await fetch(`${config.hermesApiBase}/v1/runs/${id}/events`, { headers })

    if (!response.ok || !response.body) {
      setResponseStatus(event, response.status || 502)
      return { error: { message: `Failed to connect to event stream: ${response.statusText}` } }
    }

    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    })

    return sendStream(event, response.body)
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { error: { message: `服务不可用，请联系管理员: ${err.message}` } }
  }
})
