import type {
  TimelineEntry,
  SSEEvent,
  RunState,
  ApprovalRequestEvent,
  MessageEntry,
  HermesSession,
  ToolResultEntry,
  ArtifactInfo,
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

  const { userId, sessionId, updateSession } = useAuth()
  const { connect: sseConnect, disconnect: sseDisconnect, isConnected } = useSSE()
  const fileUpload = useFileUpload()
  const containerRef = ref<HTMLElement | null>(null)
  // Bridge: Timeline component exposes { scrollEl }, extract the real DOM element
  const scrollContainerRef = computed({
    get: () => {
      const comp = containerRef.value as any
      return comp?.scrollEl ?? null
    },
    set: () => {},
  })
  const { stickToBottom, onScroll, scrollToBottom, reset: resetScroll } = useAutoScroll(scrollContainerRef)

  const sessions = ref<HermesSession[]>([])
  const sessionsLoading = ref(false)

  const isRunning = computed(() => runState.value === 'running' || runState.value === 'waiting_approval')
  const canSend = computed(() => runState.value === 'idle' && inputText.value.trim().length > 0)

  watch(() => timeline.value.length, () => { nextTick(() => scrollToBottom()) })

  // ── Load auth + sessions on mount ──
  onMounted(async () => {
    await loadSessions()
    if (sessionId.value) {
      await loadSessionMessages(sessionId.value)
    }
  })

  async function loadSessions() {
    sessionsLoading.value = true
    try {
      const res = await $fetch<{ data: HermesSession[]; userId: string | null; sessionId: string | null }>('/api/hermes/sessions')
      sessions.value = res.data || []
      if (res.userId) userId.value = res.userId
      if (!sessionId.value && res.sessionId) {
        sessionId.value = res.sessionId
      }
    } catch (err: any) {
      console.error('Failed to load sessions:', err.message)
    } finally {
      sessionsLoading.value = false
    }
  }

  async function loadSessionMessages(sid: string) {
    try {
      const res = await $fetch<{
        data: Array<{
          role: string
          content: string | any
          tool_calls?: Array<{
            id?: string
            call_id?: string
            type: string
            function: { name: string; arguments: string }
          }>
          tool_call_id?: string
          tool_name?: string
          artifacts?: ArtifactInfo[]
        }>
      }>(`/api/hermes/sessions/${sid}/messages`)
      if (res.data && res.data.length > 0) {
        const entries: TimelineEntry[] = []
        const pendingToolCalls = new Map<string, ToolResultEntry>()

        for (const msg of res.data) {
          if (msg.role === 'user') {
            entries.push({
              id: makeId(), kind: 'message', role: 'user',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              isStreaming: false, timestamp: 0,
            })
          } else if (msg.role === 'assistant') {
            // Create pending ToolResultEntry items for each tool call
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              for (const tc of msg.tool_calls) {
                const callId = tc.id || tc.call_id || ''
                const entry: ToolResultEntry = {
                  id: makeId(),
                  kind: 'tool_result',
                  toolName: tc.function?.name || tc.type || 'unknown',
                  arguments: tc.function?.arguments || '',
                  result: null,
                  collapsed: true,
                  timestamp: 0,
                }
                if (callId) pendingToolCalls.set(callId, entry)
                entries.push(entry)
              }
            }
            // Also push the assistant text message if there's content
            if (msg.content) {
              entries.push({
                id: makeId(), kind: 'message', role: 'assistant',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                isStreaming: false, timestamp: 0,
              })
            }
          } else if (msg.role === 'tool') {
            // Match tool result to the pending tool call entry
            const callId = msg.tool_call_id
            if (callId && pendingToolCalls.has(callId)) {
              const entry = pendingToolCalls.get(callId)!
              entry.result = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              entry.artifacts = msg.artifacts
              pendingToolCalls.delete(callId)
            } else {
              // Orphan tool result — create a standalone entry
              entries.push({
                id: makeId(),
                kind: 'tool_result',
                toolName: msg.tool_name || 'unknown',
                arguments: '',
                result: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                artifacts: msg.artifacts,
                collapsed: true,
                timestamp: 0,
              })
            }
          }
        }

        // Collapse old messages: keep only the last 4 user + 4 assistant messages expanded
        const KEEP_EXPANDED = 4
        let userCount = 0
        let assistantCount = 0
        for (let i = entries.length - 1; i >= 0; i--) {
          const entry = entries[i]
          if (entry.kind === 'message') {
            const msg = entry as MessageEntry
            if (msg.role === 'user') {
              userCount++
              msg.collapsed = userCount > KEEP_EXPANDED
            } else if (msg.role === 'assistant') {
              assistantCount++
              msg.collapsed = assistantCount > KEEP_EXPANDED
            }
          }
        }

        timeline.value = entries
        // Scroll to bottom after DOM renders all history entries
        nextTick(() => {
          requestAnimationFrame(() => {
            scrollToBottom(true)
          })
        })
      }
    } catch (err: any) {
      console.error('Failed to load session messages:', err.message)
    }
  }

  async function switchSession(sid: string) {
    sseDisconnect()
    runState.value = 'idle'
    pendingApproval.value = null
    error.value = null
    await updateSession(sid)
    timeline.value = []
    resetScroll()
    await loadSessionMessages(sid)
  }

  async function newChat() {
    sseDisconnect()
    timeline.value = []
    runState.value = 'idle'
    currentRunId.value = null
    pendingApproval.value = null
    error.value = null
    usage.value = null
    resetScroll()
    await updateSession('')
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
      const sid = (event as any).session_id
      if (sid) updateSession(sid)
      loadSessions()
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
      attachments: fileUpload.attachedFiles.value.length > 0
        ? [...fileUpload.attachedFiles.value]
        : undefined,
    }
    timeline.value = [...timeline.value, userMsg]
    resetScroll()
    nextTick(() => scrollToBottom(true))

    runState.value = 'running'

    try {
      const body: any = { input: msg }
      if (sessionId.value) body.session_id = sessionId.value
      const attachmentsPayload = fileUpload.getAttachmentsPayload()
      if (attachmentsPayload.length > 0) {
        body.attachments = attachmentsPayload
      }
      const response = await $fetch<{ run_id: string }>('/api/hermes/runs', {
        method: 'POST', body,
      })

      currentRunId.value = response.run_id
      fileUpload.clearFiles()

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
    sessions, sessionsLoading,
    containerRef, stickToBottom,
    sendMessage, stopRun, resolveApproval, clearChat, newChat, switchSession, onScroll,
    ...fileUpload,
  }
}
