'use client'

import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Send, Loader2, Image, Globe, Users, Lock, X, Plus, User, Settings, Grid, Edit } from 'lucide-react'
import { api, Post as ApiPost, Comment as ApiComment } from '@/lib/api'

// Local types that match your frontend structure
type Comment = {
  id: number
  userId: number
  author: string
  authorFullName: string
  profilePicture: number
  text: string
  imagePath?: string
  time: string
}

type Post = {
  id: number
  userId: number
  author: string
  authorFullName: string
  authorEmail: string
  profilePicture: number
  content: string
  imagePath?: string
  time: string
  liked: boolean
  likes: number
  comments: Comment[]
}

type UserProfile = {
  id: number
  email: string
  firstName: string
  lastName: string
  nickname?: string
  about?: string
  profilePicture?: number
  isPublic: boolean
  followersCount: number
  followingCount: number
  postsCount: number
}

// Component to display user avatar
const UserAvatar = ({ profilePicture, authorName, authorFullName, size = 'w-10 h-10', clickable = false, userId }: { 
  profilePicture?: number, 
  authorName: string, 
  authorFullName?: string, 
  size?: string,
  clickable?: boolean,
  userId?: number
}) => {
  const router = useRouter();
  
  const handleAvatarClick = () => {
    if (clickable && userId) {
      router.push(`/profile/${userId}`);
    }
  };

  const className = `${size} rounded-full ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`;

  if (profilePicture) {
    return (
      <img
        src={`http://localhost:8080/file?id=${profilePicture}`}
        alt={`${authorFullName || authorName}'s profile`}
        className={`${className} object-cover`}
        onClick={handleAvatarClick}
      />
    )
  }
  
  return (
    <div 
      className={`${className} bg-gray-200 flex items-center justify-center ${clickable ? 'hover:bg-gray-300 transition-colors' : ''}`}
      onClick={handleAvatarClick}
    >
      <User className={`${size === 'w-8 h-8' ? 'w-5 h-5' : size === 'w-10 h-10' ? 'w-6 h-6' : 'w-4 h-4'} text-gray-500`} />
    </div>
  )
}

// Helper function to format time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [followersLoading, setFollowersLoading] = useState(false)
  const [followingLoading, setFollowingLoading] = useState(false)

  // Edit profile states
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editAbout, setEditAbout] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Load profile data on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile()
      loadPosts()
    }
  }, [isAuthenticated, user])

  const loadProfile = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await api.getUserProfile(user.id)
      const profileData: UserProfile = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        nickname: response.nickname,
        about: response.about,
        profilePicture: response.profilePicture,
        isPublic: response.isPublic,
        followersCount: response.followersCount,
        followingCount: response.followingCount,
        postsCount: response.postsCount
      }
      
      setProfile(profileData)
      
      // Set edit form values
      setEditFirstName(profileData.firstName)
      setEditLastName(profileData.lastName)
      setEditNickname(profileData.nickname || '')
      setEditAbout(profileData.about || '')
      setEditIsPublic(profileData.isPublic)
      
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      const response = await api.getPosts()
      const userPosts = response.posts.filter((post: ApiPost) => post.userId === user?.id)
      const formattedPosts = userPosts.map((post: ApiPost): Post => ({
        id: post.id,
        userId: post.userId,
        author: post.author,
        authorFullName: post.authorFullName,
        authorEmail: post.authorEmail,
        profilePicture: post.profilePicture,
        content: post.content,
        imagePath: post.imagePath,
        time: formatTime(post.createdAt),
        liked: post.liked,
        likes: post.likes,
        comments: []
      }))
      setPosts(formattedPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  const loadFollowers = async () => {
    if (!user) return
    
    try {
      setFollowersLoading(true)
      const response = await api.getFollowers(user.id)
      setFollowers(response.followers || [])
    } catch (error) {
      console.error('Failed to load followers:', error)
      setFollowers([])
    } finally {
      setFollowersLoading(false)
    }
  }

  const loadFollowing = async () => {
    if (!user) return
    
    try {
      setFollowingLoading(true)
      const response = await api.getFollowing(user.id)
      setFollowing(response.following || [])
    } catch (error) {
      console.error('Failed to load following:', error)
      setFollowing([])
    } finally {
      setFollowingLoading(false)
    }
  }

  const handleShowFollowers = () => {
    setShowFollowers(true)
    loadFollowers()
  }

  const handleShowFollowing = () => {
    setShowFollowing(true)
    loadFollowing()
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      setSelectedImage(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    try {
      // Update avatar if new image selected
      if (selectedImage) {
        await api.updateAvatar(selectedImage)
      }

      // Update profile data
      await api.updateProfile({
        firstName: editFirstName,
        lastName: editLastName,
        nickname: editNickname,
        about: editAbout,
        isPublic: editIsPublic
      })

      // Reload profile data
      await loadProfile()
      
      setShowEditProfile(false)
      setSelectedImage(null)
      setImagePreview(null)
      
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    }
  }

  const toggleLike = async (postId: number) => {
    try {
      const response = await api.toggleLike(postId)
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              liked: response.liked,
              likes: response.likeCount
            }
          : post
      ))
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const loadComments = async (postId: number) => {
    try {
      const response = await api.getComments(postId)
      
      if (!response || !response.comments) {
        return
      }
      
      const formattedComments = response.comments.map((comment: ApiComment): Comment => ({
        id: comment.id,
        userId: comment.userId,
        author: comment.author,
        authorFullName: comment.authorFullName,
        profilePicture: comment.profilePicture,
        text: comment.content,
        imagePath: comment.imagePath,
        time: formatTime(comment.createdAt)
      }))
      
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, comments: formattedComments }
          : post
      ))
    } catch (error) {
      console.error('Failed to load comments:', error)
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, comments: [] }
          : post
      ))
    }
  }

  const handleAddComment = async (postId: number) => {
    if (!newComment.trim()) return

    try {
      const createdComment = await api.createComment(postId, newComment)
      const newCommentObj: Comment = {
        id: createdComment.id,
        userId: createdComment.userId,
        author: createdComment.author,
        authorFullName: createdComment.authorFullName,
        profilePicture: createdComment.profilePicture,
        text: createdComment.content,
        imagePath: createdComment.imagePath,
        time: 'Just now'
      }
      
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, newCommentObj]
            }
          : post
      ))
      setNewComment('')
      setCommentingPostId(null)
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  const toggleComments = async (postId: number) => {
    const post = posts.find(p => p.id === postId)
    if (post && post.comments.length === 0) {
      await loadComments(postId)
    }
    setCommentingPostId(commentingPostId === postId ? null : postId)
  }

  if (!isAuthenticated) {
    return <div className="text-center mt-10">Redirecting to login...</div>
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load profile</p>
          <button 
            onClick={() => router.push('/posts')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Posts
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-start md:space-x-12 space-y-8 md:space-y-0 mb-12">
          {/* Profile Picture */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <UserAvatar 
                profilePicture={profile.profilePicture}
                authorName={profile.nickname || profile.firstName}
                authorFullName={`${profile.firstName} ${profile.lastName}`}
                size="w-32 h-32 md:w-40 md:h-40"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-6">
            {/* Username and Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
              <h1 className="text-2xl font-light">
                {profile.nickname || `${profile.firstName.toLowerCase()}.${profile.lastName.toLowerCase()}`}
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="flex items-center space-x-2 px-4 py-1.5 border border-gray-300 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-1.5 border border-gray-300 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex space-x-8">
              <div className="text-center md:text-left">
                <span className="block text-xl font-semibold">{profile.postsCount}</span>
                <span className="text-gray-600 text-sm">posts</span>
              </div>
              <button 
                onClick={handleShowFollowers}
                className="text-center md:text-left hover:opacity-70 transition-opacity"
              >
                <span className="block text-xl font-semibold">{profile.followersCount}</span>
                <span className="text-gray-600 text-sm">followers</span>
              </button>
              <button 
                onClick={handleShowFollowing}
                className="text-center md:text-left hover:opacity-70 transition-opacity"
              >
                <span className="block text-xl font-semibold">{profile.followingCount}</span>
                <span className="text-gray-600 text-sm">following</span>
              </button>
            </div>

            {/* Name and Bio */}
            <div className="space-y-1">
              <h2 className="font-semibold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h2>
              {profile.about && (
                <p className="text-gray-700 whitespace-pre-line">{profile.about}</p>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {profile.isPublic ? (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Public Account</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Private Account</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-1 pb-1 border-t-2 border-black font-medium text-sm text-black">
              <Grid size={12} />
              <span>POSTS</span>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-light mb-2">No Posts Yet</h3>
                <p className="text-gray-500">
                  When you share posts, they'll appear here.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <UserAvatar 
                        profilePicture={post.profilePicture}
                        authorName={post.author}
                        authorFullName={post.authorFullName}
                        size="w-10 h-10"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-sm text-gray-900">
                            {post.authorFullName || post.author}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">{post.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <div className="px-4 pb-3">
                      <p className="text-gray-800 leading-relaxed">{post.content}</p>
                    </div>
                  )}
                  
                  {/* Post Image */}
                  {post.imagePath && (
                    <div className="relative">
                      <img 
                        src={`http://localhost:8080${post.imagePath}`}
                        alt="Post image"
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center space-x-1 transition-colors ${
                          post.liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`}
                        />
                        <span className="text-sm font-medium">{post.likes}</span>
                      </button>
                      <button 
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{post.comments.length}</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {commentingPostId === post.id && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {post.comments.length > 0 && (
                        <div className="space-y-3 mb-4 mt-4">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                              <UserAvatar 
                                profilePicture={comment.profilePicture}
                                authorName={comment.author}
                                authorFullName={comment.authorFullName}
                                size="w-8 h-8"
                                clickable={true}
                                userId={comment.userId}
                              />
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-start space-x-2">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {comment.authorFullName || comment.author}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-800 mt-1">{comment.text}</p>
                                  {comment.imagePath && (
                                    <div className="mt-2">
                                      <img 
                                        src={`http://localhost:8080${comment.imagePath}`}
                                        alt="Comment image"
                                        className="max-w-full h-auto rounded-lg border border-gray-200"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3 mt-1 px-3">
                                  <span className="text-xs text-gray-500">{comment.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Comment Input */}
                      <div className="flex items-center space-x-3 pt-3 mt-3 border-t border-gray-100">
                        <UserAvatar 
                          authorName={user?.nickname || 'User'} 
                          authorFullName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                          size="w-8 h-8"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id)
                              }
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment.trim()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Picture Upload */}
                <div className="text-center">
                  <div className="relative inline-block">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : profile.profilePicture ? (
                      <img
                        src={`http://localhost:8080/file?id=${profile.profilePicture}`}
                        alt="Current profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                      <Image className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    About
                  </label>
                  <textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                    Public Profile
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowEditProfile(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFollowers(false)}>
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Followers</h2>
                <button
                  onClick={() => setShowFollowers(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {followersLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No followers yet
                </div>
              ) : (
                <div className="space-y-3">
                  {followers.map((follower) => (
                    <div key={follower.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <UserAvatar 
                        profilePicture={follower.profilePicture}
                        authorName={follower.nickname || follower.firstName}
                        authorFullName={follower.fullName}
                        size="w-10 h-10"
                        clickable={true}
                        userId={follower.id}
                      />
                      <div className="flex-1">
                        <p 
                          className="font-medium text-gray-900 cursor-pointer hover:text-gray-600"
                          onClick={() => {
                            setShowFollowers(false)
                            router.push(`/profile/${follower.id}`)
                          }}
                        >
                          {follower.fullName}
                        </p>
                        <p className="text-sm text-gray-500">{follower.nickname}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFollowing(false)}>
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Following</h2>
                <button
                  onClick={() => setShowFollowing(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {followingLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : following.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Not following anyone yet
                </div>
              ) : (
                <div className="space-y-3">
                  {following.map((followedUser) => (
                    <div key={followedUser.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <UserAvatar 
                        profilePicture={followedUser.profilePicture}
                        authorName={followedUser.nickname || followedUser.firstName}
                        authorFullName={followedUser.fullName}
                        size="w-10 h-10"
                        clickable={true}
                        userId={followedUser.id}
                      />
                      <div className="flex-1">
                        <p 
                          className="font-medium text-gray-900 cursor-pointer hover:text-gray-600"
                          onClick={() => {
                            setShowFollowing(false)
                            router.push(`/profile/${followedUser.id}`)
                          }}
                        >
                          {followedUser.fullName}
                        </p>
                        <p className="text-sm text-gray-500">{followedUser.nickname}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}