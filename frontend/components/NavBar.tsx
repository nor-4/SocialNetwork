'use client'

import { getUserInfo, Logout } from '@/hooks/Auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BellIcon, ChatBubbleIcon, GlobeIcon, PersonIcon, FileTextIcon, PersonIcon as UserIcon } from '@radix-ui/react-icons'

export default function NavBar() {
  const { isAuthenticated, update } = useAuth()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const token = isAuthenticated ? getUserInfo() : null

  // Fetch notification count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchNotificationCount = async () => {
        try {
          const result = await api.getNotifications(1) // Just get count
          setUnreadCount(result.unreadCount)
        } catch (error) {
          console.error('Failed to fetch notification count:', error)
          setUnreadCount(0)
        }
      }

      const fetchPendingRequestsCount = async () => {
        try {
          const result = await api.getFollowRequests()
          // Handle case where result.requests might be null or undefined
          setPendingRequestsCount(result.requests?.length || 0)
        } catch (error) {
          console.error('Failed to fetch pending requests count:', error)
          setPendingRequestsCount(0)
        }
      }

      fetchNotificationCount()
      fetchPendingRequestsCount()
      
      // Poll for updates every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchPendingRequestsCount()
      }, 30000)
      return () => clearInterval(interval)
    } else {
      setUnreadCount(0)
      setPendingRequestsCount(0)
    }
  }, [isAuthenticated])

  async function navLogout() {
    Logout()
    update()
    router.push('/') 
  }

  const handleNotificationsClick = () => {
    router.push('/notifications')
  }

  const handleFollowRequestsClick = () => {
    router.push('/follow-requests')
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b shadow-sm">
      <div className="flex gap-4 items-center">
        <Link href="/" className="text-xl font-bold">SocialNet</Link>
        {isAuthenticated && (
          <>
            <Link href="/posts" className="hover:text-blue-500 flex items-center gap-1">
              <FileTextIcon /> Posts
            </Link>
            <Link href="/groups" className="hover:text-blue-500 flex items-center gap-1">
              <GlobeIcon /> Groups
            </Link>
            <Link href="/chat" className="hover:text-blue-500 flex items-center gap-1">
              <ChatBubbleIcon /> Chat
            </Link>
            <Link href="/profile" className="hover:text-blue-500 flex items-center gap-1">
              <PersonIcon /> Profile
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <>
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-full" 
              aria-label="Follow Requests"
              onClick={handleFollowRequestsClick}
            >
              <UserIcon className="w-5 h-5" />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                  {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                </span>
              )}
            </button>
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-full" 
              aria-label="Notifications"
              onClick={handleNotificationsClick}
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </>
        )}

        {isAuthenticated && token ? (
          <>
            <span>Hello, {token.nickname}</span>
            <button onClick={navLogout} className="text-blue-600 font-medium hover:underline">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Login</Link>
            <Link href="/register" className="text-blue-600 font-medium hover:underline">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}