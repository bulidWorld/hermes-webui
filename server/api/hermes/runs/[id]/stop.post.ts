import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const hermes = useHermesClient(event)
  const { data, status } = await hermes.stopRun(id)
  setResponseStatus(event, status)
  return data
})
