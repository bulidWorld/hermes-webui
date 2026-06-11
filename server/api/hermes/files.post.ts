import { useHermesClient } from '~/server/utils/hermes-client'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    logger.warn('file upload: no file in request', { label: 'upload' })
    setResponseStatus(event, 400)
    return {
      error: { message: 'No file provided', type: 'no_file_provided' },
    }
  }

  const filenames = parts.filter(p => p.filename).map(p => p.filename)
  logger.info('file upload', { label: 'upload', count: parts.length, files: filenames })

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

  if (status >= 400) {
    logger.warn('file upload: upstream error', { label: 'upload', status, body: JSON.stringify(data).slice(0, 500) })
  }

  return data
})
