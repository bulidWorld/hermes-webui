// Fetch-based SSE reader using ReadableStream.
// Supports AbortController for cancellation and custom headers.

import type { SSEEvent } from '~/types/hermes'
import { parseSSEChunk } from '~/utils/sse-parser'

export function useSSE() {
  let abortController: AbortController | null = null
  const isConnected = ref(false)

  async function connect(
    runId: string,
    onEvent: (event: SSEEvent) => void,
    onError: (err: Error) => void,
    onClose: () => void,
  ) {
    disconnect() // Ensure any previous connection is closed

    abortController = new AbortController()
    isConnected.value = true

    try {
      const response = await fetch(`/api/hermes/runs/${runId}/events`, {
        signal: abortController.signal,
        headers: { Accept: 'text/event-stream' },
      })

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const { events, buffer: remaining } = parseSSEChunk('', buffer)
        buffer = remaining

        for (const event of events) {
          onEvent(event)
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Intentional disconnect — not an error
        return
      }
      onError(err)
    } finally {
      isConnected.value = false
      onClose()
    }
  }

  function disconnect() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isConnected.value = false
  }

  onUnmounted(() => {
    disconnect()
  })

  return { connect, disconnect, isConnected }
}
