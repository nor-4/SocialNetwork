'use client'

import React, {useState, useEffect, useRef} from 'react'
import './chat-view.css'
import {getUserInfo} from '@/hooks/Auth'
import Spinner from '@/components/Spinner'
import {useAuth} from '@/components/AuthContext'


type Conversation = {
    id: number
    type: 'direct' | 'group'
    name: string
    last_message_at: string
    unread_message_count: number
}

function ChatView() {
  const {isAuthenticated: isAuth} = useAuth()
  const userInfo = (isAuth && getUserInfo()) || null

  const [message, setMessage] = useState('')
  const [allMessages, setAllMessages] = useState<any[]>([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationList, setConversationList] = useState<Conversation[] | null>(null)
  const [groupName, setGroupName] = useState('')
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<any>(null)

  const filteredMessages = allMessages.filter((msg) => msg.conversation == selectedConversation)

  useEffect(() => {
    if (!isAuth) {
      setIsConnected(false)
      ws.current?.close()
      ws.current = null
     // return console.error('not authroized')
    }

    connectToChat()

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'})
    }
  }, [filteredMessages, isAuth])

  const connectToChat = () => {
    if (isConnected || userInfo == null) return

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
      console.log(msg)

      if (msg.type === 'user_list') {
        setUsers(msg.users.filter((u: string) => u != userInfo.nickname))
      } else if (msg.type === 'group_list' && Array.isArray(msg.users)) {
        setGroups((prev) => Array.from(new Set([...prev, ...msg.users])))
      } else if (msg.type === 'message') {
        setAllMessages((prev) => [...prev, msg])
      } else if (msg.type == 'conversation_list') {
         const data = msg.conversation as Conversation[]
         setConversationList(data)
         setIsConnected(true)
      }
    }

    ws.current.onclose = () => {
      setIsConnected(false)
    }
  }

  const sendMessage = () => {
    const msg = {
      type: 'message',
      from: userInfo!.id,
      to: selectedConversation || '',
      content: message,
    }

    ws.current?.send(JSON.stringify(msg))
    setMessage('')
  }

  const createGroup = () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return

    const msg = {
      type: 'create_group',
      from: userInfo!.id,
      to: groupName,
      users: selectedGroupUsers,
    }

    ws.current?.send(JSON.stringify(msg))
    setGroupName('')
    setSelectedGroupUsers([])
    setShowGroupForm(false)
  }

  const toggleUserSelection = (user: never) => {
    if (selectedGroupUsers.includes(user)) {
      setSelectedGroupUsers(selectedGroupUsers.filter((u) => u !== user))
    } else {
      setSelectedGroupUsers([...selectedGroupUsers, user])
    }
  }

  return (
    <div className="form-container">
      <h2>Chat Page</h2>

      {!isConnected ? (
        <Spinner>
          <p className="text-lg italic text-gray-500">Loading connection form... Please wait.</p>
        </Spinner>
      ) : (
        <div className="chat-container">
          <div className="user-list">
            <h3>Conversation List</h3>
            <ul>
              <li className={!selectedConversation ? 'selected' : ''} onClick={() => setSelectedConversation(null)}>
                Everyone
              </li>
              
              {/* FIXED: Added null check before mapping */}
              {conversationList && conversationList.map((c, idx) => (
                <li key={c.id} className={selectedConversation?.id === c.id ? 'selected' : ''} onClick={() => setSelectedConversation(c)}>
                  {c.name}
                </li>
              ))}
              
              {/* Also fixed groups mapping for consistency */}
              {groups.map((group, idx) => (
                <li
                  key={group.id || idx}
                  className={selectedConversation?.id === group.id ? 'selected' : ''}
                  onClick={() => setSelectedConversation(group)}
                >
                  {group.name || group} {group.name ? '' : '(group)'}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowGroupForm(!showGroupForm)}>
              {showGroupForm ? 'Cancel' : 'Create Group'}
            </button>
            {showGroupForm && (
              <div className="group-form">
                <input
                  type="text"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <div className="group-users">
                  {users.map((user, idx) => (
                    <label key={idx}>
                      <input
                        type="checkbox"
                        checked={selectedGroupUsers.includes(user)}
                        onChange={() => toggleUserSelection(user)}
                      />
                      {user}
                    </label>
                  ))}
                </div>
                <button onClick={createGroup} disabled={!groupName || selectedGroupUsers.length === 0}>
                  Create
                </button>
              </div>
            )}
          </div>

          <div className="chat-box">
            <div className="messages">
              {filteredMessages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.sender == userInfo!.id ? 'sent' : 'received'}`}>
                  <div className="message-header">
                    <strong>{msg.from === msg.sender ? 'You' : msg.from}</strong>
                    <span className="message-time">{msg.time || ''}</span>
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input">
              <input
                type="text"
                placeholder={`Type a message${selectedConversation ? ` to ${selectedConversation.name}` : ''}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} disabled={!message}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatView
