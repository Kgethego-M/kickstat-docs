import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { firstName: 'Test' } }),
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}))

describe('Layout', () => {
  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Layout>
          <p>Page Content</p>
        </Layout>
      </BrowserRouter>
    )
    expect(screen.getByText('Page Content')).toBeInTheDocument()
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/Roster/i)).toBeInTheDocument()
    expect(screen.getByText(/Events/i)).toBeInTheDocument()
  })
})