<script setup lang="ts">
import type { RunState, ConnectionState } from '~/types/hermes'

defineProps<{
  connectionState: ConnectionState
  runState: RunState
  sessionId: string | null
  isRunning: boolean
}>()

const emit = defineEmits<{
  stop: []
  clear: []
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/80 backdrop-blur">
    <div class="flex items-center gap-3">
      <span class="text-sm font-semibold text-gray-300">Hermes</span>
      <ConnectionIndicator :state="connectionState" />
    </div>

    <div class="flex items-center gap-2">
      <!-- Session ID badge -->
      <span
        v-if="sessionId"
        class="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full font-mono max-w-[120px] truncate"
        :title="sessionId"
      >
        {{ sessionId.slice(0, 12) }}...
      </span>

      <!-- Stop button -->
      <button
        v-if="isRunning"
        class="px-3 py-1 text-xs font-medium bg-red-900/50 text-red-400 rounded-full hover:bg-red-800/50 transition-colors border border-red-800/50"
        @click="$emit('stop')"
      >
        Stop
      </button>

      <!-- Clear button -->
      <button
        class="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-400 hover:bg-gray-800 rounded-full transition-colors"
        @click="$emit('clear')"
      >
        Clear
      </button>
    </div>
  </div>
</template>
