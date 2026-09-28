import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getToken: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  apiRequest: mocks.apiRequest,
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}))

// jsdom does not implement matchMedia, which ThemeToggle uses to detect the
// OS colour scheme preference.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

function renderLayout() {
  return render(
    <BrowserRouter>
      <Layout>
        <p>Page Content</p>
      </Layout>
    </BrowserRouter>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset()
    mocks.getToken.mockReset()
    mocks.apiRequest.mockResolvedValue({ role: 'coach' })
  })

  it('renders navigation links', async () => {
    renderLayout()
    expect(screen.getByText('Page Content')).toBeInTheDocument()
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/Roster/i)).toBeInTheDocument()
    expect(screen.getByText(/Events/i)).toBeInTheDocument()
    // Await the role fetch so its state update lands inside the test.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Live' })).toBeInTheDocument()
    })
  })

  it('shows the Live nav item for staff accounts', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Live' })).toBeInTheDocument()
    })
  })

  it('hides the Live nav item for players', async () => {
    mocks.apiRequest.mockResolvedValue({ role: 'athlete' })
    renderLayout()

    await waitFor(() => {
      expect(mocks.apiRequest).toHaveBeenCalledWith('/api/account/me', {
        getToken: mocks.getToken,
      })
    })
    // Give the role state a tick to land before asserting.
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Live' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })
})
