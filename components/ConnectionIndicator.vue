<script setup lang="ts">
import type { ConnectionState } from '~/types/hermes'

defineProps<{
  state: ConnectionState
}>()

const labels: Record<ConnectionState, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Connection Error',
}

const colors: Record<ConnectionState, string> = {
  disconnected: 'bg-gray-500',
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-green-400',
  error: 'bg-red-500 animate-pulse',
}
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-gray-400">
    <span class="inline-block w-2 h-2 rounded-full" :class="colors[state]" />
    <span>{{ labels[state] }}</span>
  </div>
</template>
