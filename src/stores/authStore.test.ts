import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  describe('initial state', () => {
    it('starts as not authenticated', () => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })

    it('has no user initially', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('has no access token initially', () => {
      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
    })
  })

  describe('login', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    }
    const mockToken = 'mock-access-token'

    it('sets isAuthenticated to true', () => {
      useAuthStore.getState().login(mockUser, mockToken)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('stores the user', () => {
      useAuthStore.getState().login(mockUser, mockToken)
      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('stores the access token', () => {
      useAuthStore.getState().login(mockUser, mockToken)
      expect(useAuthStore.getState().accessToken).toBe(mockToken)
    })
  })

  describe('logout', () => {
    it('sets isAuthenticated to false', () => {
      const mockUser = { id: '1', email: 'a@b.com', name: 'A', picture: '' }
      useAuthStore.getState().login(mockUser, 'token')
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('clears the user', () => {
      const mockUser = { id: '1', email: 'a@b.com', name: 'A', picture: '' }
      useAuthStore.getState().login(mockUser, 'token')
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('clears the access token', () => {
      const mockUser = { id: '1', email: 'a@b.com', name: 'A', picture: '' }
      useAuthStore.getState().login(mockUser, 'token')
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().accessToken).toBeNull()
    })
  })
})
