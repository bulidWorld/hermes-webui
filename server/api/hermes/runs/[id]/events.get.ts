import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing run ID' } }
  }

  const hermes = useHermesClient(event)
  const result = await hermes.getRunEvents(id)

  if (!result.ok || !result.response?.body) {
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
