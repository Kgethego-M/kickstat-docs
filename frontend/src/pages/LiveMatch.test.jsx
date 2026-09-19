import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LiveMatch from './LiveMatch'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getToken: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  apiRequest: mocks.apiRequest,
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
}))

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

const athletes = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Squad Player ${i + 1}`,
  squad_number: i + 1,
  position: 'Midfielder',
  photo: null,
}))

function eventDetail(overrides = {}) {
  return {
    event: {
      id: 5,
      status: 'scheduled',
      opponent: 'Riverside FC',
      event_type: 'match',
      event_date: new Date(Date.now() - 60 * 1000).toISOString(),
      started_at: null,
      ...overrides.event,
    },
    result: { squad: 0, opponent: 0 },
    penalties: [],
    timeline: overrides.timeline || [],
    lineups: overrides.lineups || [],
  }
}

function lineupRows(starterCount = 11) {
  return athletes.slice(0, starterCount + 1).map((a, i) => ({
    athlete_id: a.id,
    team_side: 'home',
    is_starter: i < starterCount,
    pos_x: i < starterCount ? 10 + (i % 4) * 25 : null,
    pos_y: i < starterCount ? 20 + Math.floor(i / 4) * 25 : null,
    name: a.name,
    squad_number: a.squad_number,
    position: a.position,
    photo: a.photo,
  }))
}

function renderLive(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/live/:id" element={<LiveMatch />} />
        <Route path="/live/fixture/:fixtureId" element={<LiveMatch />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('LiveMatch lineup gate', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset()
    mocks.getToken.mockResolvedValue('test-token')
  })

  it('shows the lineup wizard instead of the pitch until a lineup exists', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/events/5') return Promise.resolve(eventDetail())
      if (path === '/api/athletes') return Promise.resolve(athletes)
      return Promise.resolve({})
    })

    renderLive('/live/5')

    expect(await screen.findByText('Set the lineups')).toBeInTheDocument()
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument()

    // The wizard auto-fills a starting XI (11) plus the bench (1) and labels
    // the shape it produced.
    expect(screen.getByText('11/11')).toBeInTheDocument()
    expect(screen.getByText('4-4-2')).toBeInTheDocument()
  })

  it('saves the auto-filled XI through the lineup endpoint', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/events/5') return Promise.resolve(eventDetail())
      if (path === '/api/athletes') return Promise.resolve(athletes)
      return Promise.resolve({ lineups: lineupRows() })
    })

    renderLive('/live/5')

    fireEvent.click(await screen.findByText('Save lineups & start'))

    await waitFor(() => {
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        '/api/events/5/lineup',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    const putCall = mocks.apiRequest.mock.calls.find(([path]) => path === '/api/events/5/lineup')
    const { body } = putCall[1]
    const starters = body.lineups.filter((l) => l.is_starter)
    const bench = body.lineups.filter((l) => !l.is_starter)
    expect(starters).toHaveLength(11)
    expect(bench).toHaveLength(1)
    expect(starters.every((l) => l.team_side === 'home')).toBe(true)
    expect(starters.every((l) => l.pos_x != null && l.pos_y != null)).toBe(true)
    expect(bench[0].pos_x).toBeNull()
  })

  it('renders the pitch once a lineup exists and drops the Assist quick action', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/events/5') {
        return Promise.resolve(
          eventDetail({
            event: { status: 'live', started_at: new Date().toISOString() },
            lineups: lineupRows(11),
          })
        )
      }
      if (path === '/api/athletes') return Promise.resolve(athletes)
      return Promise.resolve({})
    })

    renderLive('/live/5')

    // Pitch dots carry the starters' names.
    expect(await screen.findByText('1 · Squad Player 1')).toBeInTheDocument()
    expect(screen.getByText('11 · Squad Player 11')).toBeInTheDocument()

    // Bench row shows the non-starter.
    expect(screen.getByText('#12 Squad Player 12')).toBeInTheDocument()

    // Goal is loggable, standalone Assist is not.
    expect(screen.getByRole('button', { name: 'Goal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assist' })).not.toBeInTheDocument()
  })
})
