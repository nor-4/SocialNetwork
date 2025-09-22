'use client'
import { useAuth } from '@/components/AuthContext'
import {
  AuthButton,
  AuthCard,
  AuthContainer,
  AuthHeader,
  AuthInput,
} from '@/components/AuthStyles'
import { Login } from '@/hooks/Auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const {update} = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const response = await Login(email, password)
      if (response.error) {
        return setError(response.error)
      }

      update()
      router.push('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <AuthContainer>
      <AuthHeader
        title="Login to your account"
        subtitle="Need an account? Sign up"
        link="/register"
      />

      <AuthCard>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <AuthInput
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <AuthInput
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <AuthButton type="submit">Login</AuthButton>
        </form>
      </AuthCard>
    </AuthContainer>
  )
}

export default LoginPage
