import { useHermesClient } from '~/server/utils/hermes-client'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    setResponseStatus(event, 400)
    return {
      error: { message: 'No file provided', type: 'no_file_provided' },
    }
  }

  const formData = new FormData()
  for (const part of parts) {
    if (part.filename) {
      formData.append(
        part.name || 'file',
        new Blob([part.data], { type: part.type }),
        part.filename,
      )
    } else {
      formData.append(part.name || 'file', part.data.toString('utf-8'))
    }
  }

  const hermes = useHermesClient(event)
  const { data, status } = await hermes.uploadFile(formData)
  setResponseStatus(event, status)
  return data
})
