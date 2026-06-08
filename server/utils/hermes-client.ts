import { logger } from '~/server/utils/logger'

export interface HermesClientConfig {
  baseUrl: string
  apiKey?: string
}

export interface JsonResult {
  data: any
  status: number
  ok: boolean
  headers: Headers
}

export interface StreamResult {
  response: Response | null
  ok: boolean
  status: number
  data?: any
}

export class HermesClient {
  // ── Hermes API path definitions (all under /v1/) ──
  static readonly PATH = {
    RUNS: 'v1/runs',
    RUN_EVENTS: (id: string) => `v1/runs/${id}/events`,
    RUN_STOP: (id: string) => `v1/runs/${id}/stop`,
    RUN_APPROVAL: (id: string) => `v1/runs/${id}/approval`,
    SESSIONS: 'custom/v1/sessions',
    SESSION_MESSAGES: (id: string) => `custom/v1/sessions/${id}/messages`,
    FILES: 'custom/v1/files',
    FILE_BY_ID: (id: string) => `custom/v1/files/${id}`,
  } as const

  #baseUrl: string
  #apiKey?: string

  constructor(config: HermesClientConfig) {
    this.#baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.#apiKey = config.apiKey || undefined
  }

  // ── Private helpers ──

  #buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `${this.#baseUrl}/${cleanPath}`
  }

  #buildInit(init?: RequestInit): { method: string; headers: Record<string, string>; body?: BodyInit | null } {
    const headers: Record<string, string> = {}

    // Copy caller-provided headers first (supports Headers, array, or plain object)
    if (init?.headers) {
      const h = init.headers
      if (h instanceof Headers) {
        h.forEach((value, key) => { headers[key] = value })
      } else if (Array.isArray(h)) {
        for (const [key, value] of h) { headers[key] = value }
      } else {
        Object.assign(headers, h)
      }
    }

    // Add default auth only if caller didn't provide one (allows per-request API key override)
    if (!headers['Authorization'] && !headers['authorization'] && this.#apiKey) {
      headers['Authorization'] = `Bearer ${this.#apiKey}`
    }

    return { method: init?.method || 'GET', headers, body: init?.body }
  }

  async #request(path: string, init?: RequestInit): Promise<Response> {
    const url = this.#buildUrl(path)
    const { method, headers, body } = this.#buildInit(init)

    const fetchInit: RequestInit = { method, headers }
    if (body !== undefined && body !== null) {
      fetchInit.body = body
    }

    logger.info('hermes request', { label: 'hermes', method, url })

    const response = await fetch(url, fetchInit)

    if (response.ok) {
      logger.info('hermes response ok', { label: 'hermes', method, url, status: response.status })
    }

    return response
  }

  async #requestJson(
    path: string,
    opts?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string>; networkErrorMessage?: string; networkErrorType?: string },
  ): Promise<JsonResult> {
    const { networkErrorMessage, networkErrorType, ...init } = opts || {}
    const url = this.#buildUrl(path)
    const { method } = this.#buildInit(init)

    try {
      const response = await this.#request(path, init)
      const data = await response.json()

      if (!response.ok) {
        logger.error('hermes response error', { label: 'hermes', method, url, status: response.status, body: data })
      }

      return { data, status: response.status, ok: response.ok, headers: response.headers }
    } catch (err: any) {
      const msg = (networkErrorMessage || 'Hermes API Server unreachable: {message}').replace('{message}', err.message)
      logger.error('hermes request failed', { label: 'hermes', method, url, message: err.message })

      const errorBody: { message: string; type?: string } = { message: msg }
      if (networkErrorType) {
        errorBody.type = networkErrorType
      }

      return { data: { error: errorBody }, status: 502, ok: false, headers: new Headers() }
    }
  }

  // ── Public API methods ──

  /** POST /v1/runs */
  async createRun(body: Record<string, any>, extraHeaders?: Record<string, string>): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.RUNS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** GET /v1/sessions */
  async listSessions(params?: { userId?: string | null; limit?: number; offset?: number }): Promise<JsonResult> {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.set('user_id', params.userId)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const qs = searchParams.toString()
    const path = qs ? `${HermesClient.PATH.SESSIONS}?${qs}` : HermesClient.PATH.SESSIONS
    return this.#requestJson(path, {
      method: 'GET',
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** GET /v1/sessions/{id}/messages */
  async getSessionMessages(id: string): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.SESSION_MESSAGES(id), {
      method: 'GET',
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** GET /v1/runs/{id}/events — SSE stream */
  async getRunEvents(id: string): Promise<StreamResult> {
    const path = HermesClient.PATH.RUN_EVENTS(id)
    const url = this.#buildUrl(path)
    const { method, headers } = this.#buildInit({ headers: { Accept: 'text/event-stream' } })

    logger.info('hermes request', { label: 'hermes', method: 'GET', url, type: 'sse' })

    try {
      const response = await fetch(url, { method, headers })

      if (!response.ok || !response.body) {
        logger.error('hermes response error', { label: 'hermes', method: 'GET', url, status: response.status, type: 'sse' })
        const data = await response.json().catch(() => ({ error: { message: `Failed to connect to event stream: ${response.statusText}` } }))
        return { response: null, ok: false, status: response.status || 502, data }
      }

      logger.info('hermes sse stream opened', { label: 'hermes', method: 'GET', url, status: response.status })
      return { response, ok: true, status: response.status }
    } catch (err: any) {
      logger.error('hermes request failed', { label: 'hermes', method: 'GET', url, message: err.message, type: 'sse' })
      return {
        response: null,
        ok: false,
        status: 502,
        data: { error: { message: `服务不可用，请联系管理员: ${err.message}` } },
      }
    }
  }

  /** POST /v1/runs/{id}/stop */
  async stopRun(id: string): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.RUN_STOP(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      networkErrorMessage: '服务不可用，请联系管理员: {message}',
      networkErrorType: '', // no type field in error response
    })
  }

  /** POST /v1/runs/{id}/approval */
  async approveRun(id: string, body: any): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.RUN_APPROVAL(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      networkErrorMessage: '服务不可用，请联系管理员: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** GET /v1/files */
  async listFiles(): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.FILES, {
      method: 'GET',
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** POST /v1/files — multipart upload (no Content-Type; let fetch set boundary) */
  async uploadFile(formData: FormData): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.FILES, {
      method: 'POST',
      body: formData,
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }

  /** GET /v1/files/{id} — binary download */
  async getFile(id: string): Promise<StreamResult> {
    const path = HermesClient.PATH.FILE_BY_ID(id)
    const url = this.#buildUrl(path)
    const { method, headers } = this.#buildInit({ method: 'GET' })

    logger.info('hermes request', { label: 'hermes', method: 'GET', url })

    try {
      const response = await fetch(url, { method, headers })

      if (!response.ok) {
        const data = await response.json()
        logger.error('hermes response error', { label: 'hermes', method: 'GET', url, status: response.status, body: data })
        return { response: null, ok: false, status: response.status, data }
      }

      logger.info('hermes response ok', { label: 'hermes', method: 'GET', url, status: response.status })
      return { response, ok: true, status: response.status }
    } catch (err: any) {
      logger.error('hermes request failed', { label: 'hermes', method: 'GET', url, message: err.message })
      return {
        response: null,
        ok: false,
        status: 502,
        data: { error: { message: `Hermes API Server unreachable: ${err.message}`, type: 'server_error' } },
      }
    }
  }

  /** DELETE /v1/files/{id} */
  async deleteFile(id: string): Promise<JsonResult> {
    return this.#requestJson(HermesClient.PATH.FILE_BY_ID(id), {
      method: 'DELETE',
      networkErrorMessage: 'Hermes API Server unreachable: {message}',
      networkErrorType: 'server_error',
    })
  }
}

/** Create a HermesClient configured from the current request's runtime config. */
export function useHermesClient(event: any): HermesClient {
  const config = useRuntimeConfig(event)
  return new HermesClient({
    baseUrl: config.hermesApiBase,
    apiKey: config.hermesApiKey,
  })
}
