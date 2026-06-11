import { logger } from '~/server/utils/logger'
import { buildAttachmentDisposition, getDownloadFilenameFromQuery } from '~/server/utils/download-disposition'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Missing file ID' }
  }

  const token = getCookie(event, 'hermes_auth')
  if (!token) {
    logger.warn('file download: missing hermes_auth cookie', { label: 'download', fileId: id })
    setResponseStatus(event, 401)
    return { error: 'Unauthorized — missing auth cookie' }
  }

  const config = useRuntimeConfig(event)
  const baseUrl = normalizeBaseUrl(config.fileStorageServiceUrl)
  if (!baseUrl) {
    logger.error('file download: fileStorageServiceUrl not configured', { label: 'download', fileId: id })
    setResponseStatus(event, 500)
    return { error: 'fileStorageServiceUrl is not configured' }
  }

  const appJwtSecret = String(config.appJwtSecret || '')
  if (!appJwtSecret) {
    logger.error('file download: appJwtSecret not configured', { label: 'download', fileId: id })
    setResponseStatus(event, 500)
    return { error: 'appJwtSecret is not configured' }
  }

  const appJwt = generateAppJwt(appJwtSecret)
  const reqHeaders = { 'X-App-JWT': `${appJwt.slice(0, 20)}...${appJwt.slice(-8)}` }

  const upstreamUrl = `${baseUrl}/api/v1/files/${encodeURIComponent(id)}/download`
  logger.info('file download: proxying to storage', { label: 'download', fileId: id, upstreamUrl, reqHeaders })

  let response: Response
  try {
    response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { 'X-App-JWT': appJwt },
    })
  } catch (err: any) {
    logger.error('file download: storage unreachable', { label: 'download', fileId: id, upstreamUrl, reqHeaders, error: err.message })
    setResponseStatus(event, 502)
    return { error: `File storage service unreachable: ${err.message}` }
  }

  const resHeaders: Record<string, string> = {}
  response.headers.forEach((v, k) => { resHeaders[k] = v })

  logger.info('file download: storage response', { label: 'download', fileId: id, upstreamUrl, status: response.status, ok: response.ok, resHeaders })

  if (!response.ok) {
    setResponseStatus(event, response.status)
    const contentType = response.headers.get('Content-Type') || ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => ({ error: response.statusText }))
      : { error: (await response.text().catch(() => response.statusText)) || response.statusText }
    logger.warn('file download: storage returned error', { label: 'download', fileId: id, upstreamUrl, reqHeaders, resHeaders, body })
    return body
  }

  const headers: Record<string, string> = {}
  for (const header of ['Content-Type', 'Content-Disposition', 'Content-Length']) {
    const value = response.headers.get(header)
    if (value) headers[header] = value
  }
  const filename = getDownloadFilenameFromQuery(event)
  if (filename) {
    headers['Content-Disposition'] = buildAttachmentDisposition(filename)
  }

  setResponseHeaders(event, headers)
  return response.body
})

function normalizeBaseUrl(value: unknown): string {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
}
