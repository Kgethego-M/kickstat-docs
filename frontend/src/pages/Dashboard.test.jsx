// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getToken: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  apiRequest: mocks.apiRequest,
}))

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      firstName: 'Tasmiya',
      primaryEmailAddress: { emailAddress: 'tasmiya@example.com' },
    },
  }),
  useAuth: () => ({ getToken: mocks.getToken }),
}))

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Dashboard', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset()
    mocks.getToken.mockResolvedValue('test-token')

    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'coach' })
      if (path === '/api/squads/mine') {
        return Promise.resolve({ id: 1, name: 'Test Squad', athlete_count: 0, onboarded: true })
      }
      if (path === '/api/events') return Promise.resolve([])
      return Promise.resolve({})
    })
  })

  it('renders a welcome message', async () => {
    renderWithRouter(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Tasmiya/i)).toBeInTheDocument()
    })
  })

  it('shows the invite assistant section', async () => {
    renderWithRouter(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText(/Invite an Assistant/i)).toBeInTheDocument()
    })
  })

  it('renders navigation cards', async () => {
    renderWithRouter(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Roster/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Events/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Account/i })).toBeInTheDocument()
    })
  })
})
