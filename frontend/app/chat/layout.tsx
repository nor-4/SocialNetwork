'use client'

interface props {
  children: React.ReactNode
}

export default function ChatLayout({ children }: props) {
  return <div>{children}</div>
}