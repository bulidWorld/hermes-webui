import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const hermes = useHermesClient(event)
  const { data, status } = await hermes.listFiles()
  setResponseStatus(event, status)
  return data
})
