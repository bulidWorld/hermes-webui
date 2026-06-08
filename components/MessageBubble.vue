<script setup lang="ts">
import type { MessageEntry, FileInfo } from '~/types/hermes'

defineProps<{
  entry: MessageEntry
}>()

function downloadFile(file: FileInfo) {
  const a = document.createElement('a')
  a.href = `/api/hermes/files/${file.file_id}`
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <div
    class="flex mb-1"
    :class="entry.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        entry.role === 'user'
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-gray-800 text-gray-100 rounded-bl-md',
      ]"
    >
      <template v-if="entry.role === 'assistant'">
        <MarkdownContent :content="entry.content" />
        <span
          v-if="entry.isStreaming"
          class="inline-block w-1.5 h-4 ml-0.5 bg-gray-400 animate-pulse rounded-sm align-text-bottom"
        />
      </template>
      <template v-else>
        <p class="whitespace-pre-wrap">{{ entry.content }}</p>
      </template>

      <!-- File attachments in user messages -->
      <div
        v-if="entry.role === 'user' && entry.attachments && entry.attachments.length > 0"
        class="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/20"
      >
        <FileAttachment
          v-for="file in entry.attachments"
          :key="file.file_id"
          :file="file"
          :removable="false"
          @download="downloadFile"
        />
      </div>
    </div>
  </div>
</template>
