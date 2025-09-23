'use client'

import React, { useState, useEffect, useRef } from 'react'
import './chat-view.css'
import { getUserInfo } from '@/hooks/Auth'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/components/AuthContext'

type Conversation = {
  id: number
  type: 'direct' | 'group'
  name: string
  last_message_at: string
  unread_message_count: number
}

type Message = {
  id?: number
  type: string
  from: number
  to?: number
  content: string
  time?: string
  conversationId?: number
  sender?: number
}

type User = {
  id: number
  nickname: string
  firstName: string
  lastName: string
  fullName: string
  profilePicture: number
}

function ChatView() {
  const { isAuthenticated: isAuth } = useAuth()
  const userInfo = (isAuth && getUserInfo()) || null

  const [message, setMessage] = useState('')
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationList, setConversationList] = useState<Conversation[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const ws = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredMessages = allMessages.filter((msg) => 
    msg.conversationId === selectedConversation?.id
  )

  useEffect(() => {
    if (!isAuth || !userInfo) {
      setIsConnected(false)
      ws.current?.close()
      ws.current = null
      setLoading(false)
      return
    }

    connectToChat()
    loadUsers()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [isAuth, userInfo])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredMessages])

  const loadUsers = async () => {
    try {
      // Load followers and following to show available users for chat
      const token = localStorage.getItem('token')
      if (!token) return

      const parsedToken = JSON.parse(token)
      const authToken = parsedToken.token

      const [followersRes, followingRes] = await Promise.all([
        fetch('http://localhost:8080/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ action: 'get_followers' })
        }),
        fetch('http://localhost:8080/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ action: 'get_following' })
        })
      ])

      const followers = await followersRes.json()
      const following = await followingRes.json()

      // Combine and deduplicate users
      const allUsers = new Map<number, User>()
      
      if (followers.followers) {
        followers.followers.forEach((user: any) => {
          allUsers.set(user.id, {
            id: user.id,
            nickname: user.nickname,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            profilePicture: user.profilePicture
          })
        })
      }

      if (following.following) {
        following.following.forEach((user: any) => {
          allUsers.set(user.id, {
            id: user.id,
            nickname: user.nickname,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            profilePicture: user.profilePicture
          })
        })
      }

      setUsers(Array.from(allUsers.values()))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const connectToChat = () => {
    if (isConnected || !userInfo) return

    setLoading(true)
    ws.current = new WebSocket('ws://localhost:8080/ws')

    ws.current.onopen = () => {
      ws.current?.send(
        JSON.stringify({
          type: 'connect',
          from: userInfo.id,
        })
      )
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      console.log('Received message:', msg)

      if (msg.type === 'conversation_list') {
        const conversations = msg.conversation as Conversation[]
        setConversationList(conversations)
        setIsConnected(true)
        setLoading(false)
      } else if (msg.type === 'message') {
        setAllMessages((prev) => [...prev, msg])
      }
    }

    ws.current.onclose = () => {
      setIsConnected(false)
      setLoading(false)
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setLoading(false)
    }
  }

  const sendMessage = () => {
    if (!message.trim() || !selectedConversation || !userInfo) return

    const msg: Message = {
      type: 'message',
      from: userInfo.id,
      content: message,
      conversationId: selectedConversation.id,
    }

    ws.current?.send(JSON.stringify(msg))
    setMessage('')
  }

  const startConversation = (user: User) => {
    if (!userInfo) return

    // Check if conversation already exists
    const existingConversation = conversationList.find(conv => 
      conv.type === 'direct' && conv.name === user.fullName
    )

    if (existingConversation) {
      setSelectedConversation(existingConversation)
      setShowUserList(false)
      return
    }

    // Create new conversation
    const msg = {
      type: 'create_conversation',
      from: userInfo.id,
      users: [user.id]
    }

    ws.current?.send(JSON.stringify(msg))
    setShowUserList(false)
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!isAuth) {
    return (
      <div className="form-container">
        <h2>Chat</h2>
        <p className="text-center text-gray-600">Please log in to access chat.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="form-container">
        <h2>Chat</h2>
        <Spinner>
          <p className="text-lg italic text-gray-500">Connecting to chat... Please wait.</p>
        </Spinner>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="form-container">
        <h2>Chat</h2>
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to connect to chat server.</p>
          <button 
            onClick={connectToChat}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-container">
      <h2>Chat</h2>

      <div className="chat-container">
        <div className="user-list">
          <div className="flex justify-between items-center mb-4">
            <h3>Conversations</h3>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              {showUserList ? 'Hide Users' : 'New Chat'}
            </button>
          </div>

          {showUserList && (
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <h4 className="text-sm font-medium mb-2">Start new conversation:</h4>
              <div className="max-h-32 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => startConversation(user)}
                    className="flex items-center p-2 hover:bg-gray-200 rounded cursor-pointer"
                  >
                    {user.profilePicture ? (
                      <img
                        src={`http://localhost:8080/file?id=${user.profilePicture}`}
                        alt={user.fullName}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                        <span className="text-xs">{user.firstName[0]}</span>
                      </div>
                    )}
                    <span className="text-sm">{user.fullName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ul>
            {conversationList.map((conversation) => (
              <li
                key={conversation.id}
                className={selectedConversation?.id === conversation.id ? 'selected' : ''}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-center">
                  <span className="flex-1">{conversation.name}</span>
                  {conversation.unread_message_count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {conversation.unread_message_count}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(conversation.last_message_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>

          {conversationList.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              No conversations yet. Start a new chat!
            </p>
          )}
        </div>

        <div className="chat-box">
          {selectedConversation ? (
            <>
              <div className="border-b pb-2 mb-4">
                <h3 className="font-medium">{selectedConversation.name}</h3>
                <p className="text-sm text-gray-500">{selectedConversation.type} conversation</p>
              </div>

              <div className="messages">
                {filteredMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message ${msg.sender === userInfo!.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      {msg.content}
                    </div>
                    <div className="message-time">
                      {formatTime(msg.time)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input">
                <input
                  type="text"
                  placeholder={`Message ${selectedConversation.name}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!message.trim()}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="mb-2">Select a conversation to start chatting</p>
                <p className="text-sm">or click "New Chat" to start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatView