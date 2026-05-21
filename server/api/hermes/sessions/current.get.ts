import { getUserIdFromCookie, getSessionId } from '~/server/utils/user-store'
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const STATE_DB = resolve(homedir(), '.hermes', 'state.db')

interface MessageRow {
  id: number
  role: string
  content: string | null
  tool_call_id: string | null
  tool_calls: string | null
  tool_name: string | null
  reasoning: string | null
  reasoning_content: string | null
  finish_reason: string | null
  timestamp: number
}

function decodeContent(raw: string | null): string {
  if (!raw) return ''
  // state.db stores multimodal content as "\x00json:[...]"
  if (raw.startsWith('\x00json:')) {
    try {
      const parsed = JSON.parse(raw.slice(6))
      // Flatten multimodal parts to text
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text || '')
          .join('\n')
      }
      return String(parsed)
    } catch {
      return raw
    }
  }
  return raw
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromCookie(event)
  if (!userId) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  const sessionId = getSessionId(userId)
  if (!sessionId) {
    return { messages: [], sessionId: null }
  }

  try {
    const db = new DatabaseSync(STATE_DB, { readonly: true })

    // Walk the compression chain: collect all ancestor session_ids
    const allIds: string[] = []
    let current = sessionId
    while (current) {
      allIds.push(current)
      const parent = db.prepare(
        'SELECT parent_session_id FROM sessions WHERE id = ?'
      ).get(current) as { parent_session_id: string | null } | undefined
      current = parent?.parent_session_id || ''
    }

    // Load messages from all ancestors, ordered by timestamp
    const placeholders = allIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT id, role, content, tool_call_id, tool_calls, tool_name, reasoning, reasoning_content, finish_reason, timestamp
       FROM messages WHERE session_id IN (${placeholders}) ORDER BY timestamp, id`
    ).all(...allIds) as MessageRow[]

    db.close()

    // Convert to conversation format
    const messages: Array<Record<string, any>> = []
    for (const row of rows) {
      const msg: Record<string, any> = {
        role: row.role,
        content: decodeContent(row.content),
      }
      if (row.tool_calls) {
        try { msg.tool_calls = JSON.parse(row.tool_calls) } catch { /* skip */ }
      }
      if (row.tool_call_id) msg.tool_call_id = row.tool_call_id
      if (row.tool_name) msg.tool_name = row.tool_name
      if (row.reasoning) msg.reasoning = row.reasoning
      if (row.reasoning_content) msg.reasoning_content = row.reasoning_content
      if (row.finish_reason) msg.finish_reason = row.finish_reason
      messages.push(msg)
    }

    return { messages, sessionId }
  } catch (err: any) {
    console.error('Failed to load session history:', err.message)
    return { messages: [], sessionId }
  }
})
