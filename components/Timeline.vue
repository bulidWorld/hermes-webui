<script setup lang="ts">
import type { TimelineEntry } from '~/types/hermes'

const props = withDefaults(defineProps<{
  entries?: TimelineEntry[]
  error: string | null
}>(), {
  entries: () => [],
})

const emit = defineEmits<{
  scroll: [ev: Event]
  'attach-files': [files: File[]]
}>()

const scrollEl = ref<HTMLElement | null>(null)

defineExpose({ scrollEl })

const isDragOver = ref(false)
let dragCounter = 0

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragCounter = 0
  isDragOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('attach-files', Array.from(e.dataTransfer.files))
  }
}
</script>

<template>
  <div
    ref="scrollEl"
    class="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 relative"
    @scroll="(e: Event) => $emit('scroll', e)"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Empty state -->
    <div v-if="entries.length === 0" class="h-full flex items-center justify-center">
      <div class="text-center text-gray-600">
        <div class="text-5xl mb-4">⚡</div>
        <p class="text-lg font-medium text-gray-500">Hermes Agent</p>
        <p class="text-sm text-gray-600 mt-1">发送消息开始对话</p>
      </div>
    </div>

    <!-- Entries -->
    <TimelineEntry
      v-for="entry in entries"
      :key="entry.id"
      :entry="entry"
    />

    <!-- Error banner -->
    <div
      v-if="error"
      class="flex justify-center"
    >
      <div class="bg-red-900/40 border border-red-700/50 text-red-400 rounded-xl px-4 py-2 text-sm">
        {{ error }}
      </div>
    </div>

    <!-- Drag overlay -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 border-2 border-dashed border-blue-500/60 bg-blue-500/10 rounded-lg flex items-center justify-center z-10 pointer-events-none"
    >
      <span class="text-blue-400 text-lg font-medium">📎 拖放文件以附加</span>
    </div>

    <!-- Bottom padding for input clearance -->
    <div class="h-2" />
  </div>
</template>
