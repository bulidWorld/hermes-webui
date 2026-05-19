import type { SSEEvent } from '~/types/hermes'

// Parse SSE text/event-stream lines into typed event objects.
// Handles the data: prefix, ignores comments (lines starting with :),
// and skips malformed JSON gracefully.

export function parseSSELine(line: string): SSEEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) return null
  if (!trimmed.startsWith('data: ')) return null

  const json = trimmed.slice(6)
  try {
    const parsed = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && parsed.event) {
      return parsed as SSEEvent
    }
    return null
  } catch {
    return null
  }
}

// Parse a raw chunk of SSE text into an array of events.
// Handles partial lines (buffer) correctly.
export function parseSSEChunk(chunk: string, buffer: string): { events: SSEEvent[]; buffer: string } {
  const events: SSEEvent[] = []
  const combined = buffer + chunk
  const lines = combined.split('\n')

  // The last line may be incomplete; keep it for the next chunk
  const newBuffer = lines.pop() || ''

  for (const line of lines) {
    const event = parseSSELine(line)
    if (event) {
      events.push(event)
    }
  }

  return { events, buffer: newBuffer }
}
