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
  const timeline = ref<TimelineEntry[]>([])
  const runState = ref<RunState>('idle')
  const currentRunId = ref<string | null>(null)
  const pendingApproval = ref<ApprovalRequestEvent | null>(null)
  const error = ref<string | null>(null)
  const inputText = ref('')
  const usage = ref<{ input_tokens: number; output_tokens: number; total_tokens: number } | null>(null)

  const { userId, sessionId, updateSession, fetchMe } = useAuth()
  const { connect: sseConnect, disconnect: sseDisconnect, isConnected } = useSSE()
  const containerRef = ref<HTMLElement | null>(null)
  const { stickToBottom, onScroll, scrollToBottom, reset: resetScroll } = useAutoScroll(containerRef)

  const isRunning = computed(() => runState.value === 'running' || runState.value === 'waiting_approval')
  const canSend = computed(() => runState.value === 'idle' && inputText.value.trim().length > 0)

  watch(() => timeline.value.length, () => { nextTick(() => scrollToBottom()) })

  // ── Load auth + history on mount ──
  onMounted(async () => {
    await fetchMe()
    if (userId.value) {
      await loadHistory()
    }
  })

  async function loadHistory() {
    try {
      const res = await $fetch<{ messages: Array<{ role: string; content: string }>; sessionId: string | null }>(
        '/api/hermes/sessions/current'
      )
      if (res.messages && res.messages.length > 0) {
        const entries: TimelineEntry[] = []
        for (const msg of res.messages) {
          if (msg.role === 'user') {
            entries.push({
              id: makeId(), kind: 'message', role: 'user',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              isStreaming: false, timestamp: 0,
            })
          } else if (msg.role === 'assistant') {
            entries.push({
              id: makeId(), kind: 'message', role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              isStreaming: false, timestamp: 0,
            })
          }
        }
        timeline.value = entries
        nextTick(() => scrollToBottom(true))
      }
    } catch (err: any) {
      console.error('Failed to load history:', err.message)
    }
  }

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
      usage.value = 'usage' in event ? (event as any).usage : null
      pendingApproval.value = null
      // Update server session mapping (compression may have rotated session_id)
      const sid = (event as any).session_id
      if (sid) updateSession(sid)
    } else if (event.event === 'run.failed') {
      runState.value = 'idle'
      error.value = 'error' in event ? (event as any).error : null
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

    const userMsg: MessageEntry = {
      id: makeId(), kind: 'message', role: 'user',
      content: msg, isStreaming: false, timestamp: Date.now() / 1000,
    }
    timeline.value = [...timeline.value, userMsg]
    resetScroll()
    nextTick(() => scrollToBottom(true))

    runState.value = 'running'

    try {
      const body: any = { input: msg }
      const response = await $fetch<{ run_id: string }>('/api/hermes/runs', {
        method: 'POST', body,
      })

      currentRunId.value = response.run_id

      sseConnect(
        response.run_id,
        handleSSEEvent,
        (err) => {
          console.error('SSE error:', err)
          error.value = `Connection lost: ${err.message}. Try sending another message.`
          runState.value = 'idle'
        },
        () => { /* closed */ },
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
    try { await $fetch(`/api/hermes/runs/${currentRunId.value}/stop`, { method: 'POST', body: {} }) } catch {}
    runState.value = 'idle'
  }

  async function resolveApproval(choice: string) {
    if (!currentRunId.value) return
    try {
      await $fetch(`/api/hermes/runs/${currentRunId.value}/approval`, { method: 'POST', body: { choice } })
      pendingApproval.value = null
      runState.value = 'running'
    } catch (err: any) {
      if (err?.response?.status === 409) {
        pendingApproval.value = null
        error.value = 'This approval has expired (run already completed or timed out).'
        return
      }
      error.value = `Failed to send approval: ${err.message}`
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
    resetScroll()
  }

  return {
    timeline, runState, currentRunId, pendingApproval, error,
    inputText, usage, isRunning, canSend, isConnected,
    userId, sessionId,
    containerRef, stickToBottom,
    sendMessage, stopRun, resolveApproval, clearChat, onScroll,
  }
}
