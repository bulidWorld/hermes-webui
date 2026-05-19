import type { TimelineEntry, SSEEvent, ToolEntry, MessageEntry, ApprovalEntry, ThinkingEntry } from '~/types/hermes'
import { makeId } from '~/types/hermes'

// Pure function: takes the current timeline and a new SSE event,
// returns the updated timeline.

export function applySSEEvent(timeline: TimelineEntry[], event: SSEEvent): TimelineEntry[] {
  switch (event.event) {
    case 'message.delta':
      return handleMessageDelta(timeline, event)
    case 'tool.started':
      return handleToolStarted(timeline, event)
    case 'tool.completed':
      return handleToolCompleted(timeline, event)
    case 'reasoning.available':
      return handleReasoningAvailable(timeline, event)
    case 'approval.request':
      return handleApprovalRequest(timeline, event)
    case 'approval.responded':
      return handleApprovalResponded(timeline, event)
    case 'run.completed':
      return handleRunCompleted(timeline, event)
    case 'run.failed':
      return handleRunFailed(timeline, event)
    case 'run.cancelled':
      return handleRunCancelled(timeline, event)
    default:
      return timeline
  }
}

function handleMessageDelta(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const last = timeline[timeline.length - 1]
  if (last && last.kind === 'message' && (last as MessageEntry).isStreaming) {
    // Append delta to existing streaming message
    const updated = { ...last, content: (last as MessageEntry).content + event.delta }
    return [...timeline.slice(0, -1), updated as TimelineEntry]
  }
  // Start new streaming message
  const entry: MessageEntry = {
    id: makeId(),
    kind: 'message',
    role: 'assistant',
    content: event.delta,
    isStreaming: true,
    timestamp: event.timestamp,
  }
  return [...timeline, entry]
}

function handleToolStarted(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  // Close any open streaming message first
  const tl = closeStreamingMessage(timeline)
  const entry: ToolEntry = {
    id: makeId(),
    kind: 'tool',
    toolName: event.tool,
    preview: event.preview || '',
    status: 'running',
    timestamp: event.timestamp,
  }
  return [...tl, entry]
}

function handleToolCompleted(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  // Scan backwards for most recent ToolEntry with same toolName and status='running'
  const idx = findLastRunningTool(timeline, event.tool)
  if (idx >= 0) {
    const entry = timeline[idx] as ToolEntry
    const updated: ToolEntry = {
      ...entry,
      status: event.error ? 'error' : 'completed',
      duration: event.duration,
    }
    const result = [...timeline]
    result[idx] = updated
    return result
  }
  return timeline
}

function handleReasoningAvailable(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const tl = closeStreamingMessage(timeline)
  const entry: ThinkingEntry = {
    id: makeId(),
    kind: 'thinking',
    text: event.text || '',
    collapsed: false, // Show expanded while streaming
    timestamp: event.timestamp,
  }
  return [...tl, entry]
}

function handleApprovalRequest(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const tl = closeStreamingMessage(timeline)
  const entry: ApprovalEntry = {
    id: makeId(),
    kind: 'approval',
    command: event.command || '',
    description: event.description || '',
    patternKey: event.pattern_key,
    status: 'pending',
    timestamp: event.timestamp,
  }
  return [...tl, entry]
}

function handleApprovalResponded(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  // Update the most recent pending approval entry
  for (let i = timeline.length - 1; i >= 0; i--) {
    const e = timeline[i]
    if (e.kind === 'approval' && (e as ApprovalEntry).status === 'pending') {
      const updated: ApprovalEntry = { ...(e as ApprovalEntry), status: 'resolved', choice: event.choice }
      const result = [...timeline]
      result[i] = updated
      return result
    }
  }
  return timeline
}

function handleRunCompleted(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const tl = closeStreamingMessage(timeline)
  // Auto-collapse all thinking entries
  const collapsed = tl.map(e => {
    if (e.kind === 'thinking') return { ...e, collapsed: true } as TimelineEntry
    return e
  })
  const entry = {
    id: makeId(),
    kind: 'system' as const,
    event: 'run.completed' as const,
    output: event.output,
    usage: event.usage,
    timestamp: event.timestamp,
  }
  return [...collapsed, entry]
}

function handleRunFailed(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const tl = closeStreamingMessage(timeline)
  return [...tl, {
    id: makeId(),
    kind: 'system' as const,
    event: 'run.failed' as const,
    error: event.error,
    timestamp: event.timestamp,
  }]
}

function handleRunCancelled(timeline: TimelineEntry[], event: any): TimelineEntry[] {
  const tl = closeStreamingMessage(timeline)
  return [...tl, {
    id: makeId(),
    kind: 'system' as const,
    event: 'run.cancelled' as const,
    timestamp: event.timestamp,
  }]
}

// ── helpers ──

function closeStreamingMessage(timeline: TimelineEntry[]): TimelineEntry[] {
  const last = timeline[timeline.length - 1]
  if (last && last.kind === 'message' && (last as MessageEntry).isStreaming) {
    const updated = { ...last, isStreaming: false } as MessageEntry
    return [...timeline.slice(0, -1), updated]
  }
  return timeline
}

function findLastRunningTool(timeline: TimelineEntry[], toolName: string): number {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const e = timeline[i]
    if (e.kind === 'tool' && (e as ToolEntry).toolName === toolName && (e as ToolEntry).status === 'running') {
      return i
    }
  }
  return -1
}
