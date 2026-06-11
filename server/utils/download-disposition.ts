import type { H3Event } from 'h3'
import { getQuery } from 'h3'

export function getDownloadFilenameFromQuery(event: H3Event): string {
  const raw = getQuery(event).filename
  if (typeof raw !== 'string') return ''

  let filename = raw.trim()
  if (!filename) return ''

  try {
    filename = decodeURIComponent(filename)
  } catch {
    // H3 normally returns decoded query values already.
  }

  return filename.trim()
}

export function buildAttachmentDisposition(filename: string): string {
  const fallback = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .trim() || 'download'

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987Value(filename)}`
}

function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}
