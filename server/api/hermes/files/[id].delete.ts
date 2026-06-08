import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing file ID', type: 'invalid_request' } }
  }

  const hermes = useHermesClient(event)
  const { data, status } = await hermes.deleteFile(id)
  setResponseStatus(event, status)
  return data
})
