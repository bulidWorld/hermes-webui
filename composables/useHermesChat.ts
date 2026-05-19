import type {
  TimelineEntry,
  SSEEvent,
  RunState,
  ApprovalRequestEvent,
  MessageEntry,
} from '~/types/hermes'
import { makeId } from '~/types/hermes'
import { applySSEEvent } from '~/utils/timeline-builder'

export function useHermesChat() {
  // ── State ──
  const timeline = ref<TimelineEntry[]>([])
  const runState = ref<RunState>('idle')
  const currentRunId = ref<string | null>(null)
  const pendingApproval = ref<ApprovalRequestEvent | null>(null)
  const error = ref<string | null>(null)
  const inputText = ref('')
  const usage = ref<{ input_tokens: number; output_tokens: number; total_tokens: number } | null>(null)

  // ── Sub-modules ──
  const { sessionId, load: loadSession, save: saveSession, clear: clearSession } = useSessionStore()
  const { connect: sseConnect, disconnect: sseDisconnect, isConnected } = useSSE()
  const containerRef = ref<HTMLElement | null>(null)
  const { stickToBottom, onScroll, scrollToBottom, reset: resetScroll } = useAutoScroll(containerRef)

  // ── Computed ──
  const isRunning = computed(() => runState.value === 'running' || runState.value === 'waiting_approval')
  const canSend = computed(() => runState.value === 'idle' && inputText.value.trim().length > 0)

  // Auto-scroll when timeline changes
  watch(() => timeline.value.length, () => {
    nextTick(() => scrollToBottom())
  })

  // Load session on init
  onMounted(() => {
    loadSession()
  })

  // ── SSE event handler ──
  function handleSSEEvent(event: SSEEvent) {
    timeline.value = applySSEEvent(timeline.value, event)

    if (event.event === 'approval.request') {
      pendingApproval.value = event as ApprovalRequestEvent
      runState.value = 'waiting_approval'
    } else if (event.event === 'approval.responded') {
      pendingApproval.value = null
      runState.value = 'running'
    } else if (event.event === 'run.completed') {
      runState.value = 'idle'
      usage.value = event.usage
      pendingApproval.value = null
    } else if (event.event === 'run.failed') {
      runState.value = 'idle'
      error.value = event.error
      pendingApproval.value = null
    } else if (event.event === 'run.cancelled') {
      runState.value = 'idle'
      pendingApproval.value = null
    }
  }

  // ── Actions ──

  async function sendMessage() {
    const msg = inputText.value.trim()
    if (!msg || runState.value !== 'idle') return

    inputText.value = ''
    error.value = null
    usage.value = null

    // Push user message to timeline
    const userMsg: MessageEntry = {
      id: makeId(),
      kind: 'message',
      role: 'user',
      content: msg,
      isStreaming: false,
      timestamp: Date.now() / 1000,
    }
    timeline.value = [...timeline.value, userMsg]
    resetScroll()
    nextTick(() => scrollToBottom(true))

    // Build conversation history from timeline
    const history = buildConversationHistory(timeline.value.slice(0, -1))

    runState.value = 'running'

    try {
      const body: any = {
        input: msg,
        conversation_history: history,
      }
      if (sessionId.value) {
        body.session_id = sessionId.value
      }

      const response = await $fetch<{ run_id: string; session_id?: string }>('/api/hermes/runs', {
        method: 'POST',
        body,
      })

      currentRunId.value = response.run_id

      // Update session ID if the server returned one
      if (response.session_id) {
        saveSession(response.session_id)
      } else {
        // Server may return session_id in headers
        saveSession(response.run_id)
      }

      // Start SSE subscription
      sseConnect(
        response.run_id,
        handleSSEEvent,
        (err) => {
          console.error('SSE error:', err)
          error.value = `Connection lost: ${err.message}. Try sending another message.`
          runState.value = 'idle'
        },
        () => {
          // SSE connection closed normally
        },
      )
    } catch (err: any) {
      runState.value = 'idle'
      error.value = err?.data?.error?.message || `Failed to reach Hermes API Server: ${err.message}`
    }
  }

  async function stopRun() {
    if (!currentRunId.value) return
    runState.value = 'stopping'
    sseDisconnect()
    try {
      await $fetch(`/api/hermes/runs/${currentRunId.value}/stop`, { method: 'POST', body: {} })
    } catch {
      // Graceful — server may already have stopped
    }
    runState.value = 'idle'
  }

  async function resolveApproval(choice: string) {
    if (!currentRunId.value) return
    try {
      await $fetch(`/api/hermes/runs/${currentRunId.value}/approval`, {
        method: 'POST',
        body: { choice },
      })
      pendingApproval.value = null
      runState.value = 'running'
    } catch (err: any) {
      // 409: approval expired or already resolved — just close the modal
      if (err?.response?.status === 409) {
        pendingApproval.value = null
        error.value = 'This approval has expired (run already completed or timed out).'
        return
      }
      error.value = `Failed to send approval: ${err.message}`
    }
  }

  function dismissApproval() {
    // Auto-deny: the approval was stale or timed out
    if (pendingApproval.value) {
      resolveApproval('deny').catch(() => {})
    }
  }

  function clearChat() {
    sseDisconnect()
    timeline.value = []
    runState.value = 'idle'
    currentRunId.value = null
    pendingApproval.value = null
    error.value = null
    usage.value = null
    clearSession()
    resetScroll()
  }

  // ── Helpers ──

  function buildConversationHistory(entries: TimelineEntry[]): Array<{ role: string; content: string }> {
    return entries
      .filter((e): e is MessageEntry => e.kind === 'message')
      .map((e) => ({
        role: e.role,
        content: e.content,
      }))
  }

  return {
    // State
    timeline,
    runState,
    currentRunId,
    pendingApproval,
    error,
    inputText,
    usage,
    isRunning,
    canSend,
    isConnected,
    sessionId,
    containerRef,
    stickToBottom,
    // Actions
    sendMessage,
    stopRun,
    resolveApproval,
    dismissApproval,
    clearChat,
    onScroll,
  }
}
