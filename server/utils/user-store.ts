import { logger } from '~/server/utils/logger'

// ── Auth ──

export async function validateUser(username: string, password: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const url = config.authApiUrl as string

  try {
    const res = await $fetch<{ access_token: string }>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username, password },
    })
    if (!res.access_token) {
      logger.error('login response missing access_token', { label: 'auth', body: JSON.stringify(res) })
      return null
    }
    logger.info('login success', { label: 'auth', username })
    return res.access_token
  } catch (err: any) {
    logger.error('login API call failed', {
      label: 'auth',
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
      message: err.message,
      body: err.data ? JSON.stringify(err.data) : undefined,
    })
    return null
  }
}

export async function validateToken(token: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const url = config.authCenterUrl as string
  const apiKey = config.authApiKey as string

  if (!url) {
    logger.error('authCenterUrl not configured', { label: 'auth' })
    return null
  }

  try {
    const res = await $fetch<{ valid: boolean; payload: { preferred_username: string } }>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: { token },
    })
    if (!res.valid || !res.payload?.preferred_username) {
      logger.warn('token verify rejected', { label: 'auth', valid: res.valid, payload: res.payload })
      return null
    }
    return res.payload.preferred_username
  } catch (err: any) {
    logger.error('token verify call failed', {
      label: 'auth',
      url,
      token: token,
      apiKeyPresent: !!apiKey,
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
      message: err.message,
      body: err.data ? JSON.stringify(err.data) : undefined,
    })
    return null
  }
}

// ── Auth cookie ──

const AUTH_COOKIE = 'hermes_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export function setAuthCookie(event: any, token: string): void {
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: COOKIE_MAX_AGE,
  })
}

export function clearAuthCookie(event: any): void {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

export async function getUserIdFromCookie(event: any): Promise<string | null> {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) return null

  const userId = await validateToken(token)
  if (!userId) {
    logger.warn('cookie token validation failed', { label: 'auth' })
  }
  return userId
}
