<script setup lang="ts">
import type { FileInfo } from '~/types/hermes'

const props = defineProps<{
  file: FileInfo
  error?: string | null
  uploading?: boolean
  removable?: boolean
}>()

const emit = defineEmits<{
  remove: [fileId: string]
  download: [file: FileInfo]
}>()

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('text/')) return '📝'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType === 'application/vnd.ms-powerpoint' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '📽'
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📃'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦'
  if (mimeType.startsWith('application/')) return '📎'
  return '📎'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs group transition-colors"
    :class="[
      error
        ? 'bg-red-900/30 border border-red-700/50 text-red-400'
        : 'bg-gray-700/60 border border-gray-600/50 text-gray-300',
      props.file.mime_type?.startsWith('image/') && !error ? 'cursor-pointer hover:bg-gray-600/80' : '',
    ]"
    @click="props.file.mime_type?.startsWith('image/') && !error ? emit('download', props.file) : undefined"
  >
    <!-- Upload spinner -->
    <span v-if="uploading" class="flex-shrink-0 w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />

    <!-- File type icon -->
    <span v-else class="text-sm flex-shrink-0">{{ getFileIcon(props.file.mime_type || '') }}</span>

    <!-- File info -->
    <span class="flex-1 truncate max-w-[180px]">
      <template v-if="error">
        <span class="text-red-400">{{ props.file.filename || 'Unknown' }}</span>
        <span class="text-red-500/70 ml-1">— {{ error }}</span>
      </template>
      <template v-else>
        {{ props.file.filename || 'Unknown' }}
        <span class="text-gray-500 ml-1">{{ formatFileSize(props.file.size_bytes || 0) }}</span>
      </template>
    </span>

    <!-- Remove button -->
    <button
      v-if="removable !== false"
      class="flex-shrink-0 ml-0.5 text-gray-500 hover:text-gray-300 hover:bg-gray-600 rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors"
      @click.stop="emit('remove', props.file.file_id)"
    >
      ✕
    </button>
  </div>
</template>
