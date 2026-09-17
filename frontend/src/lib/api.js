const API_URL = import.meta.env.VITE_API_URL

// Clerk's dev-browser handshake (pk_test_*) relies on third-party storage that
// Safari can block (Private mode, or cross-site tracking prevention), and when
// it does, getToken() never settles — the UI used to sit on a disabled button
// with no error forever. Every await below is therefore bounded: a hang
// surfaces as a clear error the user can act on (refresh), instead of a freeze.
const TOKEN_TIMEOUT_MS = 12000
const REQUEST_TIMEOUT_MS = 20000

function withTimeout(promise, ms, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export async function apiRequest(path, { method = 'GET', body, getToken } = {}) {
  const token = await withTimeout(
    Promise.resolve().then(() => getToken()),
    TOKEN_TIMEOUT_MS,
    'Sign-in verification timed out. Please refresh the page and try again.'
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.', { cause: err })
    }
    throw new Error('Could not reach the server. Is the backend running?', { cause: err })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.error || `Request failed with status ${res.status}`)
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}
