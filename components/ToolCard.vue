<script setup lang="ts">
import type { ToolEntry } from '~/types/hermes'

defineProps<{
  entry: ToolEntry
}>()
</script>

<template>
  <div class="flex justify-start mb-1">
    <div
      :class="[
        'max-w-[80%] rounded-xl px-3 py-2 text-xs font-mono border transition-colors duration-300',
        entry.status === 'running'
          ? 'bg-amber-900/30 border-amber-700/50 text-amber-300'
          : entry.status === 'error'
            ? 'bg-red-900/30 border-red-700/50 text-red-300'
            : 'bg-green-900/30 border-green-700/50 text-green-300',
      ]"
    >
      <div class="flex items-center gap-2">
        <!-- Status icon -->
        <span v-if="entry.status === 'running'" class="inline-flex gap-0.5">
          <span class="w-1 h-1 bg-amber-400 rounded-full animate-pulse-dot" />
          <span class="w-1 h-1 bg-amber-400 rounded-full animate-pulse-dot" style="animation-delay: 0.2s" />
          <span class="w-1 h-1 bg-amber-400 rounded-full animate-pulse-dot" style="animation-delay: 0.4s" />
        </span>
        <span v-else-if="entry.status === 'error'" class="text-red-400">✗</span>
        <span v-else class="text-green-400">✓</span>

        <!-- Tool name -->
        <span class="font-semibold">{{ entry.toolName }}</span>

        <!-- Duration -->
        <span v-if="entry.duration != null" class="text-gray-500 ml-auto">
          {{ entry.duration.toFixed(1) }}s
        </span>
      </div>

      <!-- Preview -->
      <div
        v-if="entry.preview"
        class="mt-1 text-gray-400 truncate max-w-[300px]"
        :title="entry.preview"
      >
        {{ entry.preview }}
      </div>
    </div>
  </div>
</template>
