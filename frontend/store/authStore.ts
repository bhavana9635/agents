import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  tenantId: string | null
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  login: (token: string, tenantId: string, userId: string, email: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      tenantId: null,
      userId: null,
      email: null,
      isAuthenticated: false,
      login: (token, tenantId, userId, email) =>
        set({
          token,
          tenantId,
          userId,
          email,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          tenantId: null,
          userId: null,
          email: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    }
  )
)
