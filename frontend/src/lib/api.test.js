// AI assistance: drafted with Qoder (AI coding assistant); reviewed and tested by the project team.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiRequest } from './api'

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockResponse({ ok = true, status = 200, json = {} }) {
    globalThis.fetch.mockResolvedValue({
      ok,
      status,
      json: vi.fn().mockResolvedValue(json),
    })
  }

  it('sends the request with an auth token and JSON body', async () => {
    mockResponse({ json: { id: 1 } })
    const getToken = vi.fn().mockResolvedValue('test-token')

    await apiRequest('/api/squads/mine', {
      method: 'PATCH',
      body: { name: 'Golden Lions' },
      getToken,
    })

    expect(getToken).toHaveBeenCalledOnce()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:5001/api/squads/mine', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ name: 'Golden Lions' }),
    })
  })

  it('returns the parsed JSON response', async () => {
    mockResponse({ json: { role: 'coach' } })

    const result = await apiRequest('/api/account/me', { getToken: vi.fn() })

    expect(result).toEqual({ role: 'coach' })
  })

  it('returns null for 204 responses', async () => {
    mockResponse({ status: 204, json: {} })

    const result = await apiRequest('/api/athletes/1', {
      method: 'DELETE',
      getToken: vi.fn(),
    })

    expect(result).toBeNull()
  })

  it('throws the server error message when the request fails', async () => {
    mockResponse({ ok: false, status: 409, json: { error: 'Invite already used' } })

    await expect(
      apiRequest('/api/invites/abc123/accept', { method: 'POST', getToken: vi.fn() })
    ).rejects.toThrow('Invite already used')
  })

  it('falls back to the status code when the error body has no message', async () => {
    mockResponse({ ok: false, status: 500, json: {} })

    await expect(apiRequest('/api/account/me', { getToken: vi.fn() })).rejects.toThrow(
      'Request failed with status 500'
    )
  })

  it('falls back to the status code when the error body is not JSON', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    })

    await expect(apiRequest('/api/account/me', { getToken: vi.fn() })).rejects.toThrow(
      'Request failed with status 502'
    )
  })
})
