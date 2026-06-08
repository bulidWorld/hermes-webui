import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing session ID' } }
  }

  const hermes = useHermesClient(event)
  const { data, status } = await hermes.getSessionMessages(id)
  setResponseStatus(event, status)
  return data
})
