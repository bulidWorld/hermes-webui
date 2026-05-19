<script setup lang="ts">
import type { ApprovalRequestEvent } from '~/types/hermes'

const props = defineProps<{
  event: ApprovalRequestEvent | null
}>()

const emit = defineEmits<{
  resolve: [choice: string]
  dismiss: []
}>()

const choices = [
  { value: 'once', label: 'Execute Once', color: 'bg-blue-600 hover:bg-blue-500' },
  { value: 'session', label: 'Allow Session', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { value: 'always', label: 'Always Allow', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { value: 'deny', label: 'Deny', color: 'bg-red-600 hover:bg-red-500' },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="event"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <h2 class="text-lg font-semibold text-red-400 mb-4">
            ⚠️ Dangerous Command Requires Approval
          </h2>

          <!-- Command -->
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-500 mb-1">Command</label>
            <pre class="bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-red-300 overflow-x-auto font-mono">{{ event.command }}</pre>
          </div>

          <!-- Description -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-500 mb-1">Reason</label>
            <p class="text-sm text-gray-400">{{ event.description }}</p>
          </div>

          <!-- Choice buttons -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="choice in choices"
              :key="choice.value"
              :class="[choice.color, 'px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors']"
              @click="$emit('resolve', choice.value)"
            >
              {{ choice.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
