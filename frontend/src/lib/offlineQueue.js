// Offline-first logging queue.
//
// Live logging happens pitch-side, often with a weak or dropped signal.
// This queues log create/edit/undo actions in localStorage when a request
// fails or the browser is offline, applies them optimistically to the UI,
// and replays them in order once the connection returns — so an event's
// data is never lost to a dropped signal.
//
// Each queued action carries a client-generated id so a replayed create
// can be matched back to its optimistic row (and so retrying a request
// that actually succeeded, but whose response was lost, doesn't double it
// server-side is out of scope here — the backend has no idempotency key
// for this yet, so a real double-submit under a flaky-but-not-fully-down
// connection is a known limitation, not something this queue silently
// fixes).

const STORAGE_PREFIX = 'kickstat_offline_queue_'

function storageKey(matchKey) {
  return `${STORAGE_PREFIX}${matchKey}`
}

function readQueue(matchKey) {
  try {
    const raw = localStorage.getItem(storageKey(matchKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(matchKey, queue) {
  try {
    localStorage.setItem(storageKey(matchKey), JSON.stringify(queue))
  } catch {
    // Storage full/unavailable (private browsing) — actions still work
    // live, they just won't survive a reload while offline.
  }
}

let idCounter = 0
function clientId() {
  idCounter += 1
  return `local-${Date.now()}-${idCounter}`
}

// action: { type: 'create' | 'edit' | 'undo', path, method, body, clientId }
export function enqueue(matchKey, action) {
  const queue = readQueue(matchKey)
  const withId = { ...action, clientId: action.clientId || clientId(), queuedAt: Date.now() }
  queue.push(withId)
  writeQueue(matchKey, queue)
  return withId
}

export function getQueue(matchKey) {
  return readQueue(matchKey)
}

export function queueLength(matchKey) {
  return readQueue(matchKey).length
}

function removeFromQueue(matchKey, clientIdToRemove) {
  const queue = readQueue(matchKey).filter((a) => a.clientId !== clientIdToRemove)
  writeQueue(matchKey, queue)
}

// Replays queued actions in order against `apiRequest`, one at a time —
// order matters here (an edit/undo must land after the create it targets).
// Stops at the first failure and leaves the remaining queue intact so the
// next reconnect attempt picks up where this one left off.
export async function flushQueue(matchKey, apiRequest, getToken) {
  const queue = readQueue(matchKey)
  const results = []

  for (const action of queue) {
    try {
      const result = await apiRequest(action.path, {
        method: action.method,
        body: action.body,
        getToken,
      })
      removeFromQueue(matchKey, action.clientId)
      results.push({ clientId: action.clientId, ok: true, result })
    } catch (err) {
      results.push({ clientId: action.clientId, ok: false, error: err.message })
      break // preserve order — stop here, retry from this action next time
    }
  }

  return results
}

export function clearQueue(matchKey) {
  writeQueue(matchKey, [])
}

// Small helper so callers don't need to import both navigator.onLine and
// the 'online'/'offline' event wiring separately.
export function onConnectivityChange(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}
