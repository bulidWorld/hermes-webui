<script setup lang="ts">
import type { TimelineEntry } from '~/types/hermes'

defineProps<{
  entry: TimelineEntry
}>()
</script>

<template>
  <div>
    <MessageBubble v-if="entry.kind === 'message'" :entry="(entry as any)" />
    <ToolCard v-else-if="entry.kind === 'tool'" :entry="(entry as any)" />
    <ThinkingBlock v-else-if="entry.kind === 'thinking'" :entry="(entry as any)" />
    <div v-else-if="entry.kind === 'approval' && entry.status === 'pending'" class="flex justify-center my-2">
      <div class="bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-2 text-xs text-amber-400">
        ⏳ Waiting for approval...
      </div>
    </div>
    <div v-else-if="entry.kind === 'approval' && entry.status === 'resolved' && entry.choice !== 'deny'" class="flex justify-center my-2">
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2 text-xs text-gray-500">
        ✓ Approved ({{ entry.choice }})
      </div>
    </div>
    <div v-else-if="entry.kind === 'approval' && entry.status === 'resolved' && entry.choice === 'deny'" class="flex justify-center my-2">
      <div class="bg-red-900/50 border border-red-600/50 rounded-xl px-4 py-2 text-xs text-red-300 font-medium">
        ✗ Command denied
      </div>
      </div>
    </div>
    <div v-else-if="entry.kind === 'system'" class="flex justify-center my-3">
      <div
        :class="[
          'rounded-full px-4 py-1 text-xs font-medium',
          entry.event === 'run.completed'
            ? 'bg-green-900/40 text-green-400'
            : entry.event === 'run.failed'
              ? 'bg-red-900/40 text-red-400'
              : 'bg-gray-800/60 text-gray-500',
        ]"
      >
        <template v-if="entry.event === 'run.completed'">
          ✓ Completed
          <span v-if="entry.usage" class="ml-2 text-gray-500">
            {{ entry.usage.total_tokens?.toLocaleString() }} tokens
          </span>
        </template>
        <template v-else-if="entry.event === 'run.failed'">
          ✗ Failed{{ entry.error ? `: ${entry.error}` : '' }}
        </template>
        <template v-else>
          ■ Cancelled
        </template>
      </div>
    </div>
  </div>
</template>
