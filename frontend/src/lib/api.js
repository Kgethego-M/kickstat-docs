const API_URL = import.meta.env.VITE_API_URL

// Shared fetch helper: attaches the Clerk bearer token, JSON-encodes the body,
// and throws using the server's { error } message on a non-OK response.
// NOTE: this is a reconstruction, not a recovered original — I never received
// the actual lib/api.js file. Its signature matches exactly how Roster.jsx and
// every other page already calls it: apiRequest(path, { method, body, getToken }).
export async function apiRequest(path, { method = 'GET', body, getToken } = {}) {
  const token = await getToken()

  const headers = {
    Authorization: `Bearer ${token}`,
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // DELETE endpoints in this app return 204 with no body
  if (res.status === 204) {
    return null
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }

  return data
}
