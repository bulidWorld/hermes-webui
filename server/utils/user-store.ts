import { createHmac } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

// ── LDAP Auth ──

async function ldapAuth(userId: string, password: string, config: {
  ldapUrl: string; ldapBindDn: string; ldapBindPw: string; ldapBaseDn: string
}): Promise<boolean> {
  try {
    const ldapjs = await import('ldapjs')
    const client = ldapjs.createClient({ url: config.ldapUrl, timeout: 5000 })

    return new Promise((resolve) => {
      client.bind(config.ldapBindDn, config.ldapBindPw, (err: any) => {
        if (err) { client.destroy(); return resolve(false) }

        const userDN = `cn=${userId},${config.ldapBaseDn}`
        client.bind(userDN, password, (err2: any) => {
          client.destroy()
          resolve(!err2)
        })
      })
    })
  } catch {
    return false
  }
}

export async function validateUser(userId: string, password: string): Promise<boolean> {
  const config = useRuntimeConfig()
  return ldapAuth(userId, password, {
    ldapUrl: config.ldapUrl,
    ldapBindDn: config.ldapBindDn,
    ldapBindPw: config.ldapBindPw,
    ldapBaseDn: config.ldapBaseDn,
  })
}

// ── Session mapping ──

const SESSIONS_FILE = resolve(homedir(), '.hermes', 'webui-sessions.json')

interface SessionEntry {
  sessionId: string
  lastActive: string
}

function loadSessionMap(): Record<string, SessionEntry> {
  try {
    if (existsSync(SESSIONS_FILE)) return JSON.parse(readFileSync(SESSIONS_FILE, 'utf-8'))
  } catch { /* corrupt */ }
  return {}
}

function saveSessionMap(map: Record<string, SessionEntry>): void {
  const dir = resolve(homedir(), '.hermes')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SESSIONS_FILE, JSON.stringify(map, null, 2), 'utf-8')
}

export function getSessionId(userId: string): string | null {
  return loadSessionMap()[userId]?.sessionId || null
}

export function saveSessionId(userId: string, sessionId: string): void {
  const map = loadSessionMap()
  map[userId] = { sessionId, lastActive: new Date().toISOString() }
  saveSessionMap(map)
}

// ── Auth cookie ──

const AUTH_COOKIE = 'hermes_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function setAuthCookie(event: any, userId: string): void {
  const config = useRuntimeConfig()
  const secret = config.authSecret || 'default-secret'
  const token = `${userId}:${Date.now()}:${sign(`${userId}:${Date.now()}`, secret)}`
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: COOKIE_MAX_AGE,
  })
}

export function clearAuthCookie(event: any): void {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

export function getUserIdFromCookie(event: any): string | null {
  const config = useRuntimeConfig()
  const secret = config.authSecret || 'default-secret'
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) return null

  const parts = token.split(':')
  if (parts.length < 3) return null
  const sig = parts.pop()!
  const payload = parts.join(':')
  if (sig !== sign(payload, secret)) return null

  return parts[0] || null
}
