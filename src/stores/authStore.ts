import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  picture: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  accessToken: string | null
  login: (user: User, accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      login: (user, accessToken) =>
        set({ isAuthenticated: true, user, accessToken }),
      logout: () =>
        set({ isAuthenticated: false, user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
