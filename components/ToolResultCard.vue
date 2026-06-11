<script setup lang="ts">
import type { ToolResultEntry } from '~/types/hermes'
import { downloadFile } from '~/utils/file-download'

const props = defineProps<{
  entry: ToolResultEntry
}>()

const isExpanded = ref(false)

function toggle() {
  isExpanded.value = !isExpanded.value
}

const prettyArgs = computed(() => {
  try {
    return JSON.stringify(JSON.parse(props.entry.arguments), null, 2)
  } catch {
    return props.entry.arguments
  }
})

const prettyResult = computed(() => {
  if (!props.entry.result) return ''
  try {
    return JSON.stringify(JSON.parse(props.entry.result), null, 2)
  } catch {
    return props.entry.result
  }
})

const hasResult = computed(() => props.entry.result !== null && props.entry.result !== '')
const hasArgs = computed(() => props.entry.arguments && props.entry.arguments.trim() !== '')
const hasArtifacts = computed(() => props.entry.artifacts && props.entry.artifacts.length > 0)
</script>

<template>
  <div class="flex justify-start mb-1">
    <div
      class="max-w-[85%] rounded-xl border text-xs transition-colors duration-200"
      :class="[
        hasResult
          ? 'bg-indigo-900/20 border-indigo-700/40'
          : 'bg-amber-900/20 border-amber-700/40',
        isExpanded ? 'shadow-lg shadow-indigo-500/5' : '',
      ]"
    >
      <!-- Header: always visible, click to toggle -->
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 rounded-xl transition-colors select-none"
        @click="toggle"
      >
        <!-- Tool icon -->
        <span class="text-sm shrink-0">
          {{ hasResult ? '🔧' : '⏳' }}
        </span>

        <!-- Tool name -->
        <span class="font-semibold truncate" :class="hasResult ? 'text-indigo-300' : 'text-amber-300'">
          {{ entry.toolName }}
        </span>

        <!-- Result preview (one line, when collapsed) -->
        <span
          v-if="!isExpanded && hasResult"
          class="text-gray-500 truncate flex-1 min-w-0"
        >
          {{ prettyResult.slice(0, 80) }}{{ prettyResult.length > 80 ? '...' : '' }}
        </span>

        <span v-else-if="!isExpanded && hasArgs" class="text-gray-500 text-xs ml-auto shrink-0">
          with args
        </span>

        <span v-if="!isExpanded && hasArtifacts" class="text-emerald-300 text-xs shrink-0">
          {{ entry.artifacts?.length }} file{{ entry.artifacts?.length === 1 ? '' : 's' }}
        </span>

        <!-- Expand/collapse chevron -->
        <span class="text-gray-500 text-xs ml-auto shrink-0 transition-transform duration-200" :class="isExpanded ? 'rotate-180' : ''">
          ▼
        </span>
      </button>

      <div
        v-if="hasArtifacts"
        class="flex flex-wrap gap-1 px-3 pb-2"
        :class="isExpanded ? 'pt-1' : ''"
      >
        <FileAttachment
          v-for="artifact in entry.artifacts"
          :key="artifact.file_id || artifact.artifact_id || artifact.id"
          :file="artifact"
          :removable="false"
          @download="downloadFile"
        />
      </div>

      <!-- Expanded detail -->
      <div
        v-if="isExpanded"
        class="px-3 pb-3 space-y-2"
      >
        <!-- Arguments section -->
        <div v-if="hasArgs">
          <div class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Arguments</div>
          <pre class="bg-gray-950/60 rounded-lg p-2 text-gray-300 overflow-x-auto max-h-48 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all"><code>{{ prettyArgs }}</code></pre>
        </div>

        <!-- Result section -->
        <div v-if="hasResult">
          <div class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Result</div>
          <pre class="bg-gray-950/60 rounded-lg p-2 text-gray-300 overflow-x-auto max-h-64 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all"><code>{{ prettyResult }}</code></pre>
        </div>

        <!-- No result yet indicator -->
        <div v-if="!hasResult" class="text-amber-400/70 text-xs py-1">
          Awaiting result...
        </div>
      </div>
    </div>
  </div>
</template>
