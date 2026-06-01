<script setup lang="ts">
import type { HermesSession } from '~/types/hermes'

defineProps<{
  sessions: HermesSession[]
  activeSessionId: string | null
  loading: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'new-chat': []
}>()

function formatDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <aside class="w-72 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <h2 class="text-sm font-semibold text-gray-200">历史会话</h2>
      <button
        class="px-2.5 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        @click="emit('new-chat')"
      >
        新对话
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 p-4 space-y-3 overflow-hidden">
      <div
        v-for="i in 6"
        :key="i"
        class="h-14 rounded-lg bg-gray-800 animate-pulse"
        :style="{ opacity: 1 - i * 0.12 }"
      />
    </div>

    <!-- Empty -->
    <div v-else-if="sessions.length === 0" class="flex-1 flex items-center justify-center p-6">
      <p class="text-sm text-gray-500 text-center">暂无历史会话</p>
    </div>

    <!-- Session list -->
    <div v-else class="flex-1 overflow-y-auto p-2 space-y-0.5">
      <button
        v-for="session in sessions"
        :key="session.id"
        class="w-full text-left px-3 py-2.5 rounded-lg transition-colors group"
        :class="session.id === activeSessionId
          ? 'bg-blue-600/20 border border-blue-500/30'
          : 'hover:bg-gray-800 border border-transparent'"
        @click="emit('select', session.id)"
      >
        <div
          class="text-sm truncate"
          :class="session.id === activeSessionId ? 'text-blue-200' : 'text-gray-300'"
        >
          {{ session.title || '新对话' }}
        </div>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-gray-500">{{ formatDate(session.last_active) }}</span>
          <span
            v-if="session.message_count"
            class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
          >
            {{ session.message_count }}
          </span>
        </div>
      </button>
    </div>
  </aside>
</template>
