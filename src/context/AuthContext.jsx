import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api('/auth/me')
      .then(d => { if (!cancelled) setUser(d.user) })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (identifier, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { identifier, password } })
    setUser(d.user)
    return d.user
  }, [])

  const register = useCallback(async (form) => {
    const d = await api('/auth/register', { method: 'POST', body: form })
    setUser(d.user)
    return d.user
  }, [])

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    setUser(null)
  }, [])

  const isStaff = !!user && (user.role === 'staff' || user.role === 'manager')

  return (
    <AuthContext.Provider value={{ user, loading, isStaff, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
