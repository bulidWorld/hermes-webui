import type { FileInfo, AttachmentRef } from '~/types/hermes'

export function useFileUpload() {
  const attachedFiles = ref<FileInfo[]>([])
  const isUploading = ref(false)
  const uploadErrors = ref<Record<string, string>>({})

  async function uploadFile(file: File): Promise<FileInfo | null> {
    isUploading.value = true
    delete uploadErrors.value[file.name]

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await $fetch<{ data: FileInfo[]; warnings?: string[] }>('/api/hermes/files', {
        method: 'POST',
        body: formData,
      })

      if (res.data && res.data.length > 0) {
        const fileInfo = res.data[0]
        attachedFiles.value = [...attachedFiles.value, fileInfo]
        return fileInfo
      }

      uploadErrors.value[file.name] = 'No file data returned from server'
      return null
    } catch (err: any) {
      const message = err?.data?.error?.message || err?.message || 'Upload failed'
      uploadErrors.value[file.name] = message
      return null
    } finally {
      isUploading.value = false
    }
  }

  async function uploadFiles(files: File[]): Promise<FileInfo[]> {
    const results: FileInfo[] = []
    for (const file of files) {
      const info = await uploadFile(file)
      if (info) results.push(info)
    }
    return results
  }

  async function removeFile(fileId: string): Promise<void> {
    attachedFiles.value = attachedFiles.value.filter(f => f.file_id !== fileId)
    // Fire-and-forget: clean up on server side
    try {
      await $fetch(`/api/hermes/files/${fileId}`, { method: 'DELETE' })
    } catch {
      // Silently ignore — the server will expire the file via TTL
    }
  }

  function clearFiles(): void {
    attachedFiles.value = []
    uploadErrors.value = {}
  }

  function getAttachmentsPayload(): AttachmentRef[] {
    return attachedFiles.value.map(f => ({ file_id: f.file_id }))
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return {
    attachedFiles,
    isUploading,
    uploadErrors,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    getAttachmentsPayload,
    formatFileSize,
  }
}
