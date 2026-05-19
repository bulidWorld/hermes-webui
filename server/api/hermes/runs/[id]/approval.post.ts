// POST /api/hermes/runs/:id/approval → Hermes :8642 /v1/runs/:id/approval
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.hermesApiKey) headers['Authorization'] = `Bearer ${config.hermesApiKey}`

  try {
    const response = await fetch(`${config.hermesApiBase}/v1/runs/${id}/approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) {
      setResponseStatus(event, response.status)
    }
    return data
  } catch (err: any) {
    setResponseStatus(event, 502)
    return {
      error: { message: `服务不可用，请联系管理员: ${err.message}`, type: 'server_error' },
    }
  }
})
