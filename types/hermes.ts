// ── Request types ──

export interface HermesRunRequest {
  input: string
  instructions?: string
  conversation_history?: Array<{ role: string; content: string }>
  session_id?: string
  model?: string
  api_key?: string
}

export interface HermesRunResponse {
  run_id: string
  status: 'started'
}

// ── SSE Event types (discriminated union on .event) ──

export interface BaseSSEEvent {
  event: string
  run_id: string
  timestamp: number
}

export interface MessageDeltaEvent extends BaseSSEEvent {
  event: 'message.delta'
  delta: string
}

export interface ToolStartedEvent extends BaseSSEEvent {
  event: 'tool.started'
  tool: string
  preview: string
}

export interface ToolCompletedEvent extends BaseSSEEvent {
  event: 'tool.completed'
  tool: string
  duration: number
  error: boolean
}

export interface ReasoningAvailableEvent extends BaseSSEEvent {
  event: 'reasoning.available'
  text: string
}

export interface ApprovalRequestEvent extends BaseSSEEvent {
  event: 'approval.request'
  choices: string[]
  command: string
  description: string
  pattern_key?: string | null
  pattern_keys?: string[]
}

export interface ApprovalRespondedEvent extends BaseSSEEvent {
  event: 'approval.responded'
  choice: string
  resolved: number
}

export interface RunCompletedEvent extends BaseSSEEvent {
  event: 'run.completed'
  output: string
  usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
}

export interface RunFailedEvent extends BaseSSEEvent {
  event: 'run.failed'
  error: string
}

export interface RunCancelledEvent extends BaseSSEEvent {
  event: 'run.cancelled'
}

export type SSEEvent =
  | MessageDeltaEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | ReasoningAvailableEvent
  | ApprovalRequestEvent
  | ApprovalRespondedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent

// ── Timeline entry types (for rendering) ──

export type TimelineEntryKind = 'message' | 'tool' | 'thinking' | 'approval' | 'system'

export interface TimelineEntryBase {
  id: string
  kind: TimelineEntryKind
  timestamp: number
}

export interface MessageEntry extends TimelineEntryBase {
  kind: 'message'
  role: 'user' | 'assistant'
  content: string
  isStreaming: boolean
}

export interface ToolEntry extends TimelineEntryBase {
  kind: 'tool'
  toolName: string
  preview: string
  status: 'running' | 'completed' | 'error'
  duration?: number
}

export interface ThinkingEntry extends TimelineEntryBase {
  kind: 'thinking'
  text: string
  collapsed: boolean
}

export interface ApprovalEntry extends TimelineEntryBase {
  kind: 'approval'
  command: string
  description: string
  patternKey?: string | null
  status: 'pending' | 'resolved'
  choice?: string
}

export interface SystemEntry extends TimelineEntryBase {
  kind: 'system'
  event: 'run.completed' | 'run.failed' | 'run.cancelled'
  output?: string
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number }
  error?: string
}

export type TimelineEntry =
  | MessageEntry
  | ToolEntry
  | ThinkingEntry
  | ApprovalEntry
  | SystemEntry

// ── Connection / run state ──

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'
export type RunState = 'idle' | 'running' | 'waiting_approval' | 'stopping'

// ── Session types ──

export interface HermesSession {
  id: string
  user_id: string
  created_at: string
  last_active: number
  title?: string
  message_count?: number
}

export interface HermesSessionListResponse {
  sessions: HermesSession[]
  total: number
}

// ── Helper ──

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
