<script setup lang="ts">

defineProps<{
  modelValue: string
  canSend: boolean
  isRunning: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)

function onSend() {
  emit('send')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function focus() {
  textarea.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex items-end gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900/80">
    <textarea
      ref="textarea"
      :value="modelValue"
      :disabled="isRunning"
      placeholder="Message Hermes..."
      rows="1"
      class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50 transition-colors"
      @input="(e: Event) => { emit('update:modelValue', (e.target as HTMLTextAreaElement).value); autoResize() }"
      @keydown="onKeydown"
    />
    <button
      :disabled="!canSend"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      @click="onSend"
    >
      <span v-if="isRunning" class="flex gap-0.5">
        <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" />
        <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" style="animation-delay: 0.2s" />
        <span class="w-1 h-1 bg-white rounded-full animate-pulse-dot" style="animation-delay: 0.4s" />
      </span>
      <span v-else>Send</span>
    </button>
  </div>
</template>
