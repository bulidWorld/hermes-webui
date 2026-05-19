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
    return marked.parse(props.content) as string
  } catch {
    return props.content
  }
})
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>
