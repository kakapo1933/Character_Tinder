import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { GoogleSignInButton } from './GoogleSignInButton'
import { useAuthStore } from '../stores/authStore'

// Mock window.location for OAuth redirect
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    mockLocation.href = ''
  })

  describe('when not authenticated', () => {
    it('renders sign in button', () => {
      render(<GoogleSignInButton />)
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    })

    it('initiates OAuth flow when clicked', async () => {
      const user = userEvent.setup()
      render(<GoogleSignInButton />)

      await user.click(screen.getByRole('button', { name: /sign in with google/i }))

      expect(mockLocation.href).toContain('accounts.google.com')
      expect(mockLocation.href).toContain('oauth2')
    })
  })

  describe('when authenticated', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    }

    beforeEach(() => {
      useAuthStore.getState().login(mockUser, 'mock-token')
    })

    it('renders user avatar', () => {
      render(<GoogleSignInButton />)
      const avatar = screen.getByRole('img', { name: /test user/i })
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', mockUser.picture)
    })

    it('renders user name', () => {
      render(<GoogleSignInButton />)
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('renders sign out button', () => {
      render(<GoogleSignInButton />)
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })

    it('logs out when sign out is clicked', async () => {
      const user = userEvent.setup()
      render(<GoogleSignInButton />)

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })
})
