<script setup lang="ts">
import type { FileInfo } from '~/types/hermes'

const props = defineProps<{
  modelValue: string
  canSend: boolean
  isRunning: boolean
  attachedFiles?: FileInfo[]
  isUploading?: boolean
  uploadErrors?: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  'attach-files': [files: File[]]
  'remove-file': [fileId: string]
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function onSend() {
  emit('send')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function focus() {
  textarea.value?.focus()
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('attach-files', Array.from(input.files))
    input.value = ''
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
  // Only set false if leaving the container itself
  if ((e.currentTarget as HTMLElement) === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('attach-files', Array.from(e.dataTransfer.files))
  }
}

defineExpose({ focus })
</script>

<template>
  <div
    class="flex flex-col border-t border-gray-800 bg-gray-900/80 relative"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Drag overlay -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 border-2 border-dashed border-blue-500/60 bg-blue-500/10 rounded-lg flex items-center justify-center z-10 pointer-events-none"
    >
      <span class="text-blue-400 text-sm font-medium">📎 拖放文件到此处附加</span>
    </div>

    <!-- Attached files row -->
    <div v-if="(attachedFiles && attachedFiles.length > 0) || Object.keys(uploadErrors || {}).length > 0" class="flex flex-wrap gap-1.5 px-4 pt-2">
      <FileAttachment
        v-for="f in attachedFiles"
        :key="f.file_id"
        :file="f"
        :error="uploadErrors?.[f.filename] || null"
        :uploading="false"
        :removable="true"
        @remove="emit('remove-file', $event)"
      />
    </div>

    <!-- Input row -->
    <div class="flex items-end gap-2 px-4 py-3">
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        @change="onFileChange"
      />

      <!-- Attach file button -->
      <button
        :disabled="isRunning"
        class="flex-shrink-0 p-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="附加文件"
        @click="triggerFilePicker"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      <textarea
        ref="textarea"
        :value="modelValue"
        :disabled="isRunning"
        placeholder="输入消息..."
        rows="1"
        class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50 transition-colors"
        @input="(e: Event) => { emit('update:modelValue', (e.target as HTMLTextAreaElement).value); autoResize() }"
        @keydown="onKeydown"
      />

      <button
        :disabled="!canSend"
        class="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        @click="onSend"
      >
        <span v-if="isRunning" class="flex gap-0.5">
          <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" />
          <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" style="animation-delay: 0.2s" />
          <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" style="animation-delay: 0.4s" />
        </span>
        <span v-else>发送</span>
      </button>
    </div>
  </div>
</template>
