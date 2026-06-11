import { useHermesClient } from '~/server/utils/hermes-client'
import { logger } from '~/server/utils/logger'
import { buildAttachmentDisposition, getDownloadFilenameFromQuery } from '~/server/utils/download-disposition'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: { message: 'Missing file ID', type: 'invalid_request' } }
  }

  const hermes = useHermesClient(event)
  const result = await hermes.getFile(id)

  if (!result.ok || !result.response) {
    logger.warn('file download: upstream error', { label: 'download', fileId: id, status: result.status, data: result.data })
    setResponseStatus(event, result.status)
    return result.data
  }

  // Forward download headers
  const resHeaders: Record<string, string> = {}
  const contentType = result.response.headers.get('Content-Type')
  if (contentType) resHeaders['Content-Type'] = contentType
  const disposition = result.response.headers.get('Content-Disposition')
  if (disposition) resHeaders['Content-Disposition'] = disposition
  const filename = getDownloadFilenameFromQuery(event)
  if (filename) resHeaders['Content-Disposition'] = buildAttachmentDisposition(filename)
  const fileId = result.response.headers.get('X-File-Id')
  if (fileId) resHeaders['X-File-Id'] = fileId

  setResponseHeaders(event, resHeaders)
  return result.response.body
})
