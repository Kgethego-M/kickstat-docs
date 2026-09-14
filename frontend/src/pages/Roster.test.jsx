// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Roster from './Roster'

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

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Roster', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset()
    mocks.getToken.mockResolvedValue('test-token')
  })

  it('shows a loading state then the empty roster message for coaches', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'coach' })
      if (path === '/api/athletes') return Promise.resolve([])
      return Promise.resolve({})
    })

    renderWithRouter(<Roster />)

    expect(screen.getByText(/Loading roster/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/No athletes yet/i)).toBeInTheDocument()
      expect(screen.getByText(/Add your first athlete/i)).toBeInTheDocument()
    })
  })

  it('renders athletes with edit/remove actions for coaches', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'coach' })
      if (path === '/api/athletes') {
        return Promise.resolve([
          { id: 1, name: 'Alex Morgan', position: 'Forward', squad_number: 13 },
          { id: 2, name: 'Casey Keller', position: 'Goalkeeper', squad_number: 1 },
        ])
      }
      return Promise.resolve({})
    })

    renderWithRouter(<Roster />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Casey Keller' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Edit roster/i }))

    expect(screen.getAllByRole('button', { name: /^Edit$/i }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: /Remove/i }).length).toBe(2)
  })

  it('opens the add-athlete form when the coach clicks Add athlete', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'coach' })
      if (path === '/api/athletes') return Promise.resolve([])
      return Promise.resolve({})
    })

    renderWithRouter(<Roster />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add athlete/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Add athlete/i }))

    expect(screen.getByRole('heading', { name: /Add athlete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save athlete/i })).toBeInTheDocument()
  })

  it('hides coach actions for athletes', async () => {
    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'athlete' })
      if (path === '/api/athletes') {
        return Promise.resolve([{ id: 1, name: 'Alex Morgan', position: 'Forward' }])
      }
      return Promise.resolve({})
    })

    renderWithRouter(<Roster />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /Add athlete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument()
  })

  it('deletes an athlete after confirming', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))

    mocks.apiRequest.mockImplementation((path) => {
      if (path === '/api/account/me') return Promise.resolve({ role: 'coach' })
      if (path === '/api/athletes') {
        return Promise.resolve([{ id: 1, name: 'Alex Morgan', position: 'Forward' }])
      }
      if (path === '/api/athletes/1') return Promise.resolve(null)
      return Promise.resolve({})
    })

    renderWithRouter(<Roster />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit roster/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Edit roster/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove/i }))

    expect(window.confirm).toHaveBeenCalledWith('Remove this athlete from the roster?')

    await waitFor(() => {
      expect(mocks.apiRequest).toHaveBeenCalledWith('/api/athletes/1', {
        method: 'DELETE',
        getToken: mocks.getToken,
      })
    })
  })
})
