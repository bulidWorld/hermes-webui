<script setup lang="ts">
import type { ThinkingEntry } from '~/types/hermes'

const props = defineProps<{
  entry: ThinkingEntry
}>()

const isOpen = ref(false)
</script>

<template>
  <div class="flex justify-start mb-1">
    <div class="max-w-[85%] rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden">
      <button
        class="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/70 transition-colors"
        @click="isOpen = !isOpen"
      >
        <span class="transform transition-transform duration-200" :class="{ 'rotate-90': isOpen }">▸</span>
        <span>💭 Thinking</span>
        <span class="text-gray-600 ml-auto">{{ isOpen ? 'collapse' : 'expand' }}</span>
      </button>
      <div
        v-show="isOpen"
        class="px-3 py-2 text-xs text-gray-400 leading-relaxed border-t border-gray-700/30 max-h-48 overflow-y-auto whitespace-pre-wrap"
      >
        {{ entry.text }}
      </div>
    </div>
  </div>
</template>
