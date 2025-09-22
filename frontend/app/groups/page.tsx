'use client'

import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Send, Users, Calendar, Plus } from 'lucide-react'

// Type definitions
type Comment = {
  id: number
  author: string
  text: string
  time: string
}

type Post = {
  id: number
  author: string
  content: string
  time: string
  liked: boolean
  likes: number
  comments: Comment[]
}

type Event = {
  id: number
  title: string
  description: string
  dateTime: string
  responses: {
    going: string[]
    notGoing: string[]
  }
}

type GroupMember = {
  id: number
  name: string
  role: 'creator' | 'member'
}

type GroupInvite = {
  id: number
  groupId: number
  groupName: string
  inviter: string
}

type GroupRequest = {
  id: number
  groupId: number
  userId: number
  userName: string
}

type Group = {
  id: number
  title: string
  description: string
  members: GroupMember[]
  posts: Post[]
  events: Event[]
  invites: GroupInvite[]
  requests: GroupRequest[]
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

export default function GroupsPage() {
  // Authentication and routing hooks
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // State management
  const [groups, setGroups] = useState<Group[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [newComment, setNewComment] = useState('')
  const [newPost, setNewPost] = useState('')
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')
  const [newEventDateTime, setNewEventDateTime] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [view, setView] = useState<'my-groups' | 'all-groups'>('my-groups')
  const [inviteUser, setInviteUser] = useState('')

  // Current user data
  const currentUser = { id: 1, name: 'You' }
  const activeGroup = groups.find((g) => g.id === activeGroupId)

  // Initialize with fake data
  useEffect(() => {
    if (isAuthenticated) {
      setGroups([
        {
          id: 1,
          title: 'Cat Lovers',
          description: 'A group for all cat enthusiasts',
          members: [
            { id: 1, name: 'You', role: 'creator' },
            { id: 2, name: 'Meow', role: 'member' },
          ],
          posts: [
            {
              id: 1,
              author: 'Meow',
              content: 'Meowwwwww! Cats are the best!',
              time: '2 mins ago',
              liked: false,
              likes: 3,
              comments: [
                {
                  id: 1,
                  author: 'You',
                  text: 'I totally agree!',
                  time: '1 min ago',
                },
              ],
            },
          ],
          events: [
            {
              id: 1,
              title: 'Cat Meetup',
              description: 'Monthly gathering of cat lovers',
              dateTime: '2023-12-15T18:00',
              responses: {
                going: ['You', 'Meow'],
                notGoing: [],
              },
            },
          ],
          invites: [],
          requests: [],
        },
      ])

      setAllGroups([
        {
          id: 1,
          title: 'Cat Lovers',
          description: 'A group for all cat enthusiasts',
          members: [],
          posts: [],
          events: [],
          invites: [],
          requests: [],
        },
        {
          id: 2,
          title: 'Dog Lovers',
          description: 'For people who prefer dogs',
          members: [],
          posts: [],
          events: [],
          invites: [],
          requests: [],
        },
      ])

      setActiveGroupId(1)
    }
  }, [isAuthenticated])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Helper functions
  const toggleLike = (postId: number) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: !post.liked,
                likes: post.liked ? post.likes - 1 : post.likes + 1,
              }
            : post
        ),
      }))
    )
  }

  const handleAddPost = () => {
    if (!newPost.trim() || !activeGroupId) return

    const newPostObj: Post = {
      id: Date.now(),
      author: currentUser.name,
      content: newPost,
      time: 'Just now',
      liked: false,
      likes: 0,
      comments: [],
    }

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId
          ? { ...group, posts: [newPostObj, ...group.posts] }
          : group
      )
    )
    setNewPost('')
  }

  const handleAddComment = (postId: number) => {
    if (!newComment.trim() || !activeGroupId) return

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId
          ? {
              ...group,
              posts: group.posts.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      comments: [
                        ...post.comments,
                        {
                          id: Date.now(),
                          author: currentUser.name,
                          text: newComment,
                          time: 'Just now',
                        },
                      ],
                    }
                  : post
              ),
            }
          : group
      )
    )
    setNewComment('')
  }

  const handleCreateGroup = () => {
    if (!newGroupTitle.trim()) return

    const newGroup: Group = {
      id: Date.now(),
      title: newGroupTitle,
      description: newGroupDesc,
      members: [{ id: currentUser.id, name: currentUser.name, role: 'creator' }],
      posts: [],
      events: [],
      invites: [],
      requests: [],
    }

    setGroups([newGroup, ...groups])
    setNewGroupTitle('')
    setNewGroupDesc('')
    setShowCreateGroup(false)
    setActiveGroupId(newGroup.id)
  }

  const handleCreateEvent = () => {
    if (!newEventTitle.trim() || !activeGroupId) return

    const newEvent: Event = {
      id: Date.now(),
      title: newEventTitle,
      description: newEventDesc,
      dateTime: newEventDateTime,
      responses: {
        going: [currentUser.name],
        notGoing: [],
      },
    }

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId
          ? { ...group, events: [...group.events, newEvent] }
          : group
      )
    )

    setNewEventTitle('')
    setNewEventDesc('')
    setNewEventDateTime('')
    setShowCreateEvent(false)
  }

  const handleJoinGroup = (groupId: number) => {
    setAllGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              requests: [
                ...group.requests,
                {
                  id: Date.now(),
                  groupId,
                  userId: currentUser.id,
                  userName: currentUser.name,
                },
              ],
            }
          : group
      )
    )
  }

  const handleInviteUser = () => {
    if (!inviteUser.trim() || !activeGroupId) return

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId
          ? {
              ...group,
              invites: [
                ...group.invites,
                {
                  id: Date.now(),
                  groupId: activeGroupId,
                  groupName: group.title,
                  inviter: currentUser.name,
                },
              ],
            }
          : group
      )
    )
    setInviteUser('')
  }

  const handleRespondToEvent = (eventId: number, response: 'going' | 'notGoing') => {
    if (!activeGroupId) return

    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId
          ? {
              ...group,
              events: group.events.map((event) => {
                if (event.id === eventId) {
                  const going = event.responses.going.filter(
                    (name) => name !== currentUser.name
                  )
                  const notGoing = event.responses.notGoing.filter(
                    (name) => name !== currentUser.name
                  )

                  if (response === 'going') {
                    going.push(currentUser.name)
                  } else {
                    notGoing.push(currentUser.name)
                  }

                  return {
                    ...event,
                    responses: { going, notGoing },
                  }
                }
                return event
              }),
            }
          : group
      )
    )
  }

  if (!isAuthenticated) {
    return <div className="text-center mt-10">Redirecting to login...</div>
  }

  return (
    <main className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Groups</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="text-indigo-600 hover:text-indigo-800"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-6">
          <button
            onClick={() => setView('my-groups')}
            className={`w-full text-left px-3 py-2 rounded-md ${
              view === 'my-groups'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setView('all-groups')}
            className={`w-full text-left px-3 py-2 rounded-md ${
              view === 'all-groups'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Browse Groups
          </button>
        </div>

        {view === 'my-groups' && (
          <div className="space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                  activeGroupId === group.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{group.title}</span>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {group.members.length}
                </span>
              </button>
            ))}
          </div>
        )}

        {view === 'all-groups' && (
          <div className="space-y-1">
            {allGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-md"
              >
                <div>
                  <h3 className="font-medium">{group.title}</h3>
                  <p className="text-xs text-gray-500 truncate">
                    {group.description}
                  </p>
                </div>
                <button
                  onClick={() => handleJoinGroup(group.id)}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeGroup ? (
          <>
            {/* Group Header */}
            <div className="bg-white p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeGroup.title}
              </h1>
              <p className="text-gray-600 mt-1">{activeGroup.description}</p>
              <div className="flex items-center mt-4 space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{activeGroup.members.length} members</span>
                </div>
                {activeGroup.members.some(
                  (m) => m.id === currentUser.id && m.role === 'creator'
                ) && (
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Create Event</span>
                  </button>
                )}
                <div className="flex-1"></div>
                <input
                  type="text"
                  placeholder="Invite by username"
                  value={inviteUser}
                  onChange={(e) => setInviteUser(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleInviteUser}
                  disabled={!inviteUser.trim()}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invite
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Events Section */}
              {activeGroup.events.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGroup.events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                      >
                        <h3 className="font-bold text-lg">{event.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>
                            {new Date(event.dateTime).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToEvent(event.id, 'going')}
                              className={`px-3 py-1 text-sm rounded-md ${
                                event.responses.going.includes(currentUser.name)
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              Going ({event.responses.going.length})
                            </button>
                            <button
                              onClick={() =>
                                handleRespondToEvent(event.id, 'notGoing')
                              }
                              className={`px-3 py-1 text-sm rounded-md ${
                                event.responses.notGoing.includes(currentUser.name)
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              Not Going ({event.responses.notGoing.length})
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Creation */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full font-bold">
                    {initials(currentUser.name)}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={`What's happening in ${activeGroup.title}?`}
                      className="w-full p-3 bg-white border border-gray-300 rounded-md mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddPost}
                        disabled={!newPost.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts List */}
              {activeGroup.posts.map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full font-bold">
                      {initials(post.author)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {post.author}
                          </p>
                          <p className="text-xs text-gray-500">{post.time}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-gray-900">{post.content}</p>

                      {/* Post Actions */}
                      <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center space-x-1 text-sm ${
                            post.liked
                              ? 'text-red-500'
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              post.liked ? 'fill-current' : ''
                            }`}
                          />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-indigo-500">
                          <MessageCircle className="w-5 h-5" />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {post.comments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                          <h3 className="font-medium text-sm text-gray-900">
                            Comments
                          </h3>
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                              <div className="w-8 h-8 bg-gray-100 text-gray-600 flex items-center justify-center rounded-full text-xs font-bold">
                                {initials(comment.author)}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900">
                                      {comment.author}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {comment.time}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-900">
                                    {comment.text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="mt-4 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 text-gray-600 flex items-center justify-center rounded-full text-xs font-bold">
                          {initials(currentUser.name)}
                        </div>
                        <div className="flex-1 relative">
                          <input
                            className="w-full bg-gray-50 border border-gray-300 rounded-full py-2 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!newComment.trim()}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-700">
                Select a group to view its content
              </h2>
              <p className="text-gray-500 mt-2">
                Or create a new group to get started
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Title
                </label>
                <input
                  type="text"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter group title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter group description"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter event description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newEventDateTime}
                  onChange={(e) => setNewEventDateTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateEvent(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEventTitle.trim() || !newEventDateTime}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}