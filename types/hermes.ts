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

export type TimelineEntryKind = 'message' | 'tool' | 'tool_result' | 'thinking' | 'approval' | 'system'

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
  attachments?: FileInfo[]
}

export interface ToolEntry extends TimelineEntryBase {
  kind: 'tool'
  toolName: string
  preview: string
  status: 'running' | 'completed' | 'error'
  duration?: number
}

/** Historical tool call + result loaded from session messages. */
export interface ToolResultEntry extends TimelineEntryBase {
  kind: 'tool_result'
  toolName: string
  arguments: string
  result: string | null
  collapsed: boolean
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
  | ToolResultEntry
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

// ── File types ──

export interface FileInfo {
  file_id: string
  filename: string
  mime_type: string
  size_bytes: number
  remote_url?: string
  created_at: number
  expires_at: number
}

export interface FileUploadResponse {
  object: 'list'
  data: FileInfo[]
  warnings?: string[]
}

export interface FileListResponse {
  object: 'list'
  data: FileInfo[]
}

export interface FileDeleteResponse {
  id: string
  object: 'file'
  deleted: boolean
}

export interface AttachmentRef {
  file_id: string
}

// ── Helper ──

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
