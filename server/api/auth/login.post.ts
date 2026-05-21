import { validateUser, setAuthCookie, getSessionId } from '~/server/utils/user-store'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = String(body.userId || '').trim()
  const password = String(body.password || '')

  if (!userId || !password) {
    setResponseStatus(event, 400)
    return { error: '请输入用户名和密码' }
  }

  logger.info('login attempt', { label: 'auth', userId })

  const token = await validateUser(userId, password)
  if (!token) {
    setResponseStatus(event, 401)
    return { error: '用户名或密码错误' }
  }

  setAuthCookie(event, token)
  logger.info('login cookie set', { label: 'auth', userId })

  return { userId, sessionId: getSessionId(userId) }
})
