// AI assistance: drafted with Qoder (AI coding assistant); reviewed and tested by the project team.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

const clerkState = vi.hoisted(() => ({ signedIn: false }))

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }) => (clerkState.signedIn ? children : null),
  SignedOut: ({ children }) => (clerkState.signedIn ? null : children),
  SignInButton: ({ children }) => <>{children}</>,
  SignUpButton: ({ children }) => <>{children}</>,
}))

describe('Home', () => {
  beforeEach(() => {
    clerkState.signedIn = false
  })

  it('shows the landing page with sign-in actions for signed-out visitors', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'KickStat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument()
  })

  it('hides sign-in actions for signed-in users so they are redirected to the dashboard', () => {
    clerkState.signedIn = true

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'KickStat' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sign in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create account/i })).not.toBeInTheDocument()
  })
})
