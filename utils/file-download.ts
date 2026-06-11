import type { ArtifactInfo, FileInfo } from '~/types/hermes'

type DownloadableFile = FileInfo | ArtifactInfo

const STORAGE_DOWNLOAD_PATH_RE = /\/api\/v1\/files\/([^/?#]+)\/download/
const STORAGE_ID_RE = /^file-\d+-[a-z0-9]+$/i
const HERMES_FILE_ID_RE = /^file_[a-z0-9]+$/i

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function getStorageFileIdFromUrl(url: string): string {
  const match = url.match(STORAGE_DOWNLOAD_PATH_RE)
  return match ? decodeURIComponent(match[1]) : ''
}

function buildStorageDownloadUrl(fileId: string, filename?: string): string {
  const params = new URLSearchParams()
  if (filename) params.set('filename', filename)
  const qs = params.toString()
  return `/api/v1/files/${encodeURIComponent(fileId)}/download${qs ? `?${qs}` : ''}`
}

function buildHermesDownloadUrl(fileId: string, filename?: string): string {
  const params = new URLSearchParams()
  if (filename) params.set('filename', filename)
  const qs = params.toString()
  return `/api/hermes/files/${encodeURIComponent(fileId)}${qs ? `?${qs}` : ''}`
}

function getExplicitUrl(file: DownloadableFile): string {
  return firstString(
    (file as any).download_url,
    (file as any).downloadUrl,
    (file as any).remote_url,
    (file as any).url,
    (file as any).href,
  )
}

function getPublicStorageId(file: DownloadableFile): string {
  const explicitUrl = getExplicitUrl(file)
  return firstString(
    (file as any).public_id,
    (file as any).publicId,
    (file as any).storage_id,
    (file as any).storageId,
    getStorageFileIdFromUrl(explicitUrl),
    getStorageFileIdFromUrl(firstString((file as any).remote_path, (file as any).path)),
  )
}

/**
 * Extract the best available file ID from a FileInfo or ArtifactInfo.
 * Attempts file_id first, then storage/artifact IDs.
 * Logs a warning when no usable ID is found so we can trace data shape issues.
 */
export function getDownloadFileId(file: DownloadableFile): string {
  const id = firstString(
    file.file_id,
    (file as any).fileId,
    getPublicStorageId(file),
    (file as any).public_id,
    (file as any).publicId,
    (file as any).artifact_id,
    (file as any).artifactId,
    (file as any).id,
  )

  if (!id) {
    console.warn('[file-download] No file ID found on object:', JSON.stringify(file))
  }

  return id
}

export function getDownloadFileName(file: DownloadableFile): string {
  return firstString(
    file.filename,
    (file as any).name,
    (file as any).basename,
    file.file_id,
    (file as any).fileId,
    getPublicStorageId(file),
    (file as any).artifact_id,
    (file as any).artifactId,
    (file as any).id,
    'download',
  )
}

export function getDownloadFileSize(file: DownloadableFile): number {
  return ('size_bytes' in file && file.size_bytes) || ('size' in file && file.size) || 0
}

export function buildDownloadUrl(fileId: string): string {
  return HERMES_FILE_ID_RE.test(fileId) ? buildHermesDownloadUrl(fileId) : buildStorageDownloadUrl(fileId)
}

export function getDownloadUrl(file: DownloadableFile): string {
  const filename = getDownloadFileName(file)
  const fileId = firstString(file.file_id, (file as any).fileId)
  if (fileId) {
    return HERMES_FILE_ID_RE.test(fileId)
      ? buildHermesDownloadUrl(fileId, filename)
      : buildStorageDownloadUrl(fileId, filename)
  }

  const storageId = getPublicStorageId(file)
  if (storageId) {
    return buildStorageDownloadUrl(storageId, filename)
  }

  const explicitUrl = getExplicitUrl(file)
  if (explicitUrl) {
    return explicitUrl
  }

  const fallbackId = firstString((file as any).artifact_id, (file as any).artifactId, (file as any).id)
  return fallbackId ? buildDownloadUrl(fallbackId) : ''
}

export function canDownloadFile(file: DownloadableFile): boolean {
  return !!getDownloadUrl(file)
}

/**
 * Programmatically trigger a file download by creating a temporary anchor element.
 * Uses the download API endpoint which proxies to the file storage service.
 */
export function downloadFile(file: DownloadableFile) {
  const href = getDownloadUrl(file)
  if (!href) {
    console.warn('[file-download] Cannot download: empty download URL for:', file.filename || file)
    return
  }

  const a = document.createElement('a')
  a.href = href
  a.download = getDownloadFileName(file)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
