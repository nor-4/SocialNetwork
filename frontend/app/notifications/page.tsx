'use client'

import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BellIcon, Check, X, User, Users, Calendar, Mail, Heart, MessageCircle } from 'lucide-react'

type Notification = {
  id: number
  userId: number
  type: 'follow-request' | 'group-invite' | 'join-request' | 'group-event' | 'message' | 'like' | 'comment' | 'follow_accept' | 'follow_decline'
  message: string
  isRead: boolean
  relatedId?: number
  senderId?: number
  createdAt: string
  senderName?: string
  senderAvatar?: number
}

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications from API
  useEffect(() => {
    if (!isAuthenticated) return

    const loadNotifications = async () => {
      try {
        const result = await api.getNotifications(20)
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
      } catch (error) {
        console.error('Failed to load notifications:', error)
        setNotifications([])
        setUnreadCount(0)
      }
    }

    loadNotifications()
  }, [isAuthenticated])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id)
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? {...n, isRead: true} : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleAction = (notification: Notification, action: 'accept' | 'reject') => {
    markAsRead(notification.id)
    // Here you would make API calls to handle the action
    console.log(`${action}ed ${notification.type}`)
    
    // Remove the notification after action
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'follow-request': return <User className="w-5 h-5 text-blue-500" />
      case 'group-invite': return <Users className="w-5 h-5 text-green-500" />
      case 'join-request': return <Users className="w-5 h-5 text-purple-500" />
      case 'group-event': return <Calendar className="w-5 h-5 text-orange-500" />
      case 'message': return <Mail className="w-5 h-5 text-red-500" />
      case 'like': return <Heart className="w-5 h-5 text-pink-500" />
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'follow_accept': return <User className="w-5 h-5 text-green-500" />
      case 'follow_decline': return <User className="w-5 h-5 text-red-500" />
      default: return <BellIcon className="w-5 h-5" />
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    // Use the message from the backend directly for like and comment notifications
    if (notification.type === 'like' || notification.type === 'comment' || 
        notification.type === 'follow_accept' || notification.type === 'follow_decline') {
      return notification.message
    }
    
    // For other types, construct message as before
    switch (notification.type) {
      case 'follow-request':
        // Use senderName if available, otherwise fallback to generic message
        return notification.senderName 
          ? `${notification.senderName} wants to follow you`
          : 'Someone wants to follow you'
      case 'group-invite':
        return `Invited to join a group`
      case 'join-request':
        // Use senderName if available, otherwise fallback to generic message
        return notification.senderName 
          ? `${notification.senderName} wants to join a group`
          : 'Someone wants to join a group'
      case 'group-event':
        return `New group event created`
      case 'message':
        // Use senderName if available, otherwise fallback to generic message
        return notification.senderName 
          ? `New message from ${notification.senderName}`
          : 'New message from someone'
      default:
        return notification.message || 'New notification'
    }
  }

  if (!isAuthenticated) {
    return <div className="text-center mt-10">Redirecting to login...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <span className="bg-blue-500 text-white text-sm px-2 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`p-4 rounded-lg border ${notification.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {notification.senderAvatar ? (
                    <img 
                      src={`/file?id=${notification.senderAvatar}`}
                      alt={notification.senderName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {getNotificationMessage(notification)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  {/* Actions for specific notification types */}
                  {!notification.isRead && (
                    <div className="mt-3 flex gap-2">
                      {(notification.type === 'follow-request' || 
                        notification.type === 'group-invite' || 
                        notification.type === 'join-request') && (
                        <>
                          <button
                            onClick={() => handleAction(notification, 'accept')}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() => handleAction(notification, 'reject')}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 flex items-center gap-1"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}
                      {notification.type === 'message' && (
                        <button
                          onClick={() => {
                            markAsRead(notification.id)
                            router.push('/chat')
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                        >
                          View Message
                        </button>
                      )}
                      {notification.type === 'group-event' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                        >
                          View Event
                        </button>
                      )}
                      {(notification.type === 'like' || notification.type === 'comment') && (
                        <button
                          onClick={() => {
                            markAsRead(notification.id)
                            router.push('/posts')
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                        >
                          View Post
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}