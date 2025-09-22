'use client'

import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, FollowRequest } from '@/lib/api'
import { User, Check, X } from 'lucide-react'

export default function FollowRequestsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Load follow requests from API
  useEffect(() => {
    if (!isAuthenticated) return

    const loadFollowRequests = async () => {
      try {
        setLoading(true)
        const result = await api.getFollowRequests()
        // Handle case where result.requests might be null or undefined
        setRequests(Array.isArray(result.requests) ? result.requests : [])
      } catch (error) {
        console.error('Failed to load follow requests:', error)
        setRequests([])
      } finally {
        setLoading(false)
      }
    }

    loadFollowRequests()
  }, [isAuthenticated])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleAccept = async (requestId: number) => {
    try {
      await api.acceptFollowRequest(requestId)
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))
    } catch (error) {
      console.error('Failed to accept follow request:', error)
      alert('Failed to accept follow request')
    }
  }

  const handleDecline = async (requestId: number) => {
    try {
      await api.declineFollowRequest(requestId)
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))
    } catch (error) {
      console.error('Failed to decline follow request:', error)
      alert('Failed to decline follow request')
    }
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

  if (!isAuthenticated) {
    return <div className="text-center mt-10">Redirecting to login...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Follow Requests</h1>
        <span className="bg-blue-500 text-white text-sm px-2 py-1 rounded-full">
          {/* Use optional chaining to safely access length */}
          {requests?.length || 0} pending
        </span>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Loading follow requests...</p>
        </div>
      ) : (requests?.length || 0) === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No pending follow requests
        </div>
      ) : (
        <div className="space-y-4">
          {requests?.map(request => (
            <div key={request.id} className="p-4 rounded-lg border bg-white">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {request.profilePicture ? (
                    <img 
                      src={`/file?id=${request.profilePicture}`}
                      alt={request.followerName}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{request.followerName}</p>
                      <p className="text-sm text-gray-500">{request.followerNick}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(request.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="px-4 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}