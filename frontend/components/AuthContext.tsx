'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { isUserLoggedIn, getUserInfo } from '@/hooks/Auth'

interface AuthContextType {
  isAuthenticated: boolean
  update: () => void
  user?: {
    id?: number
    nickname?: string
    email?: string
    firstName?: string
    lastName?: string
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthContextType['user']>(undefined)

  const update = () => {
    const status = isUserLoggedIn()
    const userInfo = getUserInfo()
    setIsAuthenticated(status)
    setUser(userInfo || undefined)
  }

  useEffect(() => {
    update()
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, update, user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
