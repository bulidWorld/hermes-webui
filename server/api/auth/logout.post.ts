import { clearAuthCookie } from '~/server/utils/user-store'

export default defineEventHandler(async (event) => {
  clearAuthCookie(event)
  return { ok: true }
})
