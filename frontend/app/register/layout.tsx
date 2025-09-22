'use client'

import '@/app/login/auth.css'

export default function AuthLayout({children}: {children: React.ReactNode}) {
  return <div className="auth-pages">{children}</div>
}
