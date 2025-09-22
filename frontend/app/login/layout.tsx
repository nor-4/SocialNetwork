'use client'

import './auth.css'

type props = {
  children: React.ReactNode
}

export default function AuthLayout({children}: props) {
  return <div className="auth-pages">{children}</div>
}
