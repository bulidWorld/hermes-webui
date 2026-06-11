import { createHmac } from 'node:crypto'

function base64urlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64url')
    .replace(/=+$/, '')
}

/**
 * Generate a HS256 JWT for machine-to-machine authentication.
 * Creates a short-lived token (~5 minutes) with caller identity and timestamps.
 */
export function generateAppJwt(secret: string, serviceName: string = 'hermes-webui'): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    service: serviceName,
    iat: now,
    exp: now + 300, // 5 minutes
  }

  const encodedHeader = base64urlEncode(JSON.stringify(header))
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')
    .replace(/=+$/, '')

  return `${signingInput}.${signature}`
}
