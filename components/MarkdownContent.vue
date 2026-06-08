<script setup lang="ts">
import { marked } from 'marked'

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

const props = defineProps<{
  content: string
}>()

const html = computed(() => {
  try {
    // Pre-process fenced JSON code blocks: pretty-print with 2-space indent
    let content = props.content
    content = content.replace(/```json\s*\n([\s\S]*?)```/g, (_match: string, code: string) => {
      try {
        const formatted = JSON.stringify(JSON.parse(code), null, 2)
        return '```json\n' + formatted + '\n```'
      } catch {
        return _match // keep original if not valid JSON
      }
    })
    return marked.parse(content) as string
  } catch {
    return props.content
  }
})
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>
