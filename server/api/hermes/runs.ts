import { getUserIdFromCookie, getSessionId } from '~/server/utils/user-store'
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const STATE_DB = resolve(homedir(), '.hermes', 'state.db')

function decodeContent(raw: string | null): string {
  if (!raw) return ''
  if (raw.startsWith('\x00json:')) {
    try {
      const parsed = JSON.parse(raw.slice(6))
      if (Array.isArray(parsed)) {
        return parsed.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('\n')
      }
      return String(parsed)
    } catch { return raw }
  }
  return raw
}

function loadConversationHistory(sessionId: string): Array<Record<string, any>> {
  try {
    const db = new DatabaseSync(STATE_DB, { readonly: true })
    const allIds: string[] = []
    let current = sessionId
    while (current) {
      allIds.push(current)
      const parent = db.prepare('SELECT parent_session_id FROM sessions WHERE id = ?').get(current) as any
      current = parent?.parent_session_id || ''
    }

    const placeholders = allIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT role, content, tool_calls, tool_call_id, tool_name, reasoning, reasoning_content, finish_reason
       FROM messages WHERE session_id IN (${placeholders}) ORDER BY timestamp, id`
    ).all(...allIds) as any[]

    db.close()

    return rows.map((row: any) => {
      const msg: Record<string, any> = { role: row.role, content: decodeContent(row.content) }
      if (row.tool_calls) { try { msg.tool_calls = JSON.parse(row.tool_calls) } catch { /* skip */ } }
      if (row.tool_call_id) msg.tool_call_id = row.tool_call_id
      if (row.tool_name) msg.tool_name = row.tool_name
      if (row.reasoning) msg.reasoning = row.reasoning
      if (row.reasoning_content) msg.reasoning_content = row.reasoning_content
      if (row.finish_reason) msg.finish_reason = row.finish_reason
      return msg
    })
  } catch (err: any) {
    console.error('Failed to load conversation history:', err.message)
    return []
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  // Read auth cookie for user context
  const userId = await getUserIdFromCookie(event)
  const sessionId = body.session_id || (userId ? getSessionId(userId) : null)

  // Auto-load conversation history from state.db if session exists
  let conversationHistory = body.conversation_history || []
  if (!conversationHistory.length && sessionId) {
    conversationHistory = loadConversationHistory(sessionId)
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionId) headers['X-Hermes-Session-Id'] = sessionId

  // Build gateway_session_key for per-user memory scoping
  const sessionKey = userId ? `agent:main:webui:dm:${userId}` : (body.session_key || undefined)
  if (sessionKey) headers['X-Hermes-Session-Key'] = sessionKey

  const apiKey = body.api_key || config.hermesApiKey
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  // Build forwarded request body
  const forwardedBody: Record<string, any> = {
    input: body.input,
    instructions: body.instructions,
    model: body.model,
  }
  if (conversationHistory.length) {
    forwardedBody.conversation_history = conversationHistory
  }
  if (sessionId) {
    forwardedBody.session_id = sessionId
  }

  try {
    const response = await fetch(`${config.hermesApiBase}/v1/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardedBody),
    })

    const resHeaders: Record<string, string> = {}
    const sid = response.headers.get('X-Hermes-Session-Id')
    if (sid) resHeaders['X-Hermes-Session-Id'] = sid
    const sk = response.headers.get('X-Hermes-Session-Key')
    if (sk) resHeaders['X-Hermes-Session-Key'] = sk

    const data = await response.json()
    if (!response.ok) {
      setResponseStatus(event, response.status)
    }
    setResponseHeaders(event, resHeaders)
    return data
  } catch (err: any) {
    setResponseStatus(event, 502)
    return {
      error: { message: `Hermes API Server unreachable: ${err.message}`, type: 'server_error' },
    }
  }
})
