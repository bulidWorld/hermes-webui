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
}>()

defineExpose({})
</script>

<template>
  <div
    class="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
    @scroll="(e: Event) => $emit('scroll', e)"
  >
    <!-- Empty state -->
    <div v-if="entries.length === 0" class="h-full flex items-center justify-center">
      <div class="text-center text-gray-600">
        <div class="text-5xl mb-4">⚡</div>
        <p class="text-lg font-medium text-gray-500">Hermes Agent</p>
        <p class="text-sm text-gray-600 mt-1">Send a message to start a conversation</p>
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

    <!-- Bottom padding for input clearance -->
    <div class="h-2" />
  </div>
</template>
