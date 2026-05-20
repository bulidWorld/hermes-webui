import { validateUser, setAuthCookie, getSessionId } from '~/server/utils/user-store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = String(body.userId || '').trim()
  const password = String(body.password || '')

  if (!userId || !password) {
    setResponseStatus(event, 400)
    return { error: '请输入用户名和密码' }
  }

  const valid = await validateUser(userId, password)
  if (!valid) {
    setResponseStatus(event, 401)
    return { error: '用户名或密码错误' }
  }

  setAuthCookie(event, userId)

  return { userId, sessionId: getSessionId(userId) }
})
