'use client'

import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Send, Loader2, Image, Globe, Users, Lock, X, Plus, User } from 'lucide-react'
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

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

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

export default function PostsPage() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [newComment, setNewComment] = useState('')
  const [newPost, setNewPost] = useState('')
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null)
  const [showCreatePost, setShowCreatePost] = useState(false)
  
  // Enhanced post creation states
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'followers' | 'private'>('public')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [followers, setFollowers] = useState<any[]>([])
  const [selectedFollowers, setSelectedFollowers] = useState<number[]>([])
  const [showFollowerSelection, setShowFollowerSelection] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Load posts on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadPosts()
      loadFollowers()
    }
  }, [isAuthenticated])

  const loadPosts = async () => {
    try {
      setLoading(true)
      
      // Debug authentication
      console.log('Debug auth info:');
      api.debugAuth();
      
      const response = await api.getPosts()
      console.log('Raw API response posts:', response.posts);
      const formattedPosts = response.posts.map((post: ApiPost): Post => {
        const formattedPost = {
          id: post.id,
          userId: post.userId || post.id, // Fallback to post.id if userId is missing
          author: post.author,
          authorFullName: post.authorFullName,
          authorEmail: post.authorEmail,
          profilePicture: post.profilePicture,
          content: post.content,
          imagePath: post.imagePath,
          time: formatTime(post.createdAt),
          liked: post.liked,
          likes: post.likes,
          comments: [] // We'll load comments on demand
        };
        console.log('Formatted post:', { id: formattedPost.id, userId: formattedPost.userId, author: formattedPost.author });
        return formattedPost;
      })
      setPosts(formattedPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
      alert('Failed to load posts: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowers = async () => {
    try {
      const response = await api.getFollowers()
      setFollowers(response.followers)
    } catch (error) {
      console.error('Failed to load followers:', error)
    }
  }

  // Optional loading placeholder while redirect is being handled
  if (!isAuthenticated) {
    return <div className="text-center mt-10">Redirecting to login...</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
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
      alert('Failed to toggle like')
    }
  }

  const handleAddPost = async () => {
    if (!newPost.trim()) return

    try {
      let selectedFollowersForPost: number[] | undefined = undefined
      if (postPrivacy === 'private') {
        selectedFollowersForPost = selectedFollowers
      }

      const createdPost = await api.createPost(newPost, postPrivacy, selectedImage || undefined, selectedFollowersForPost)
      const newPostObj: Post = {
        id: createdPost.id,
        userId: createdPost.userId,
        author: createdPost.author,
        authorFullName: createdPost.authorFullName,
        authorEmail: createdPost.authorEmail,
        profilePicture: createdPost.profilePicture,
        content: createdPost.content,
        imagePath: createdPost.imagePath,
        time: 'Just now',
        liked: createdPost.liked,
        likes: createdPost.likes,
        comments: []
      }
      setPosts(prev => [newPostObj, ...prev])
      
      // Reset form
      setNewPost('')
      setSelectedImage(null)
      setImagePreview(null)
      setPostPrivacy('public')
      setSelectedFollowers([])
      setShowFollowerSelection(false)
      setShowCreatePost(false)
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('Failed to create post')
    }
  }

  const loadComments = async (postId: number) => {
    try {
      const response = await api.getComments(postId)
      
      // Add null check and fallback for comments
      if (!response || !response.comments) {
        console.warn('No comments found or invalid response structure:', response)
        return // Exit early if comments is null/undefined
      }
      
      const formattedComments = response.comments.map((comment: ApiComment): Comment => {
        const formattedComment = {
          id: comment.id,
          userId: comment.userId || comment.id, // Fallback if userId is missing
          author: comment.author,
          authorFullName: comment.authorFullName,
          profilePicture: comment.profilePicture,
          text: comment.content,
          imagePath: comment.imagePath,
          time: formatTime(comment.createdAt)
        };
        console.log('Formatted comment:', { id: formattedComment.id, userId: formattedComment.userId, author: formattedComment.author });
        return formattedComment;
      })
      
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, comments: formattedComments }
          : post
      ))
    } catch (error) {
      console.error('Failed to load comments:', error)
      // Set empty comments array on error to prevent map error
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, comments: [] }
          : post
      ))
      alert('Failed to load comments')
    }
  }

  const handleAddComment = async (postId: number) => {
    if (!newComment.trim()) return

    try {
      const createdComment = await api.createComment(postId, newComment)
      const newCommentObj: Comment = {
        id: createdComment.id,
        userId: createdComment.userId || createdComment.id, // Fallback if userId is missing
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
              comments: [...post.comments, newCommentObj],
              commentsCount: post.comments.length + 1
            }
          : post
      ))
      setNewComment('')
      setCommentingPostId(null)
    } catch (error) {
      console.error('Failed to create comment:', error)
      alert('Failed to create comment')
    }
  }

  const toggleComments = async (postId: number) => {
    const post = posts.find(p => p.id === postId)
    if (post && post.comments.length === 0) {
      await loadComments(postId)
    }
    setCommentingPostId(commentingPostId === postId ? null : postId)
  }

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file')
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handlePrivacyChange = (privacy: 'public' | 'followers' | 'private') => {
    setPostPrivacy(privacy)
    if (privacy === 'private') {
      setShowFollowerSelection(true)
    } else {
      setShowFollowerSelection(false)
      setSelectedFollowers([])
    }
  }

  const toggleFollowerSelection = (followerId: number) => {
    setSelectedFollowers(prev => {
      if (prev.includes(followerId)) {
        return prev.filter(id => id !== followerId)
      } else {
        return [...prev, followerId]
      }
    })
  }

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public': return <Globe className="w-4 h-4" />
      case 'followers': return <Users className="w-4 h-4" />
      case 'private': return <Lock className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl w-full mx-auto px-4 py-6">
        {/* Create Post Button */}
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={() => setShowCreatePost(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors duration-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreatePost(false)}>
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Create Post</h2>
                  <button
                    onClick={() => setShowCreatePost(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <UserAvatar 
                      authorName={user?.nickname || 'User'} 
                      authorFullName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                      size="w-10 h-10"
                    />
                    <div className="flex-1">
                      <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        rows={4}
                      />
                    </div>
                  </div>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-90 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Privacy Selector */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Privacy</label>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handlePrivacyChange('public')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          postPrivacy === 'public' 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Public</span>
                      </button>
                      <button
                        onClick={() => handlePrivacyChange('followers')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          postPrivacy === 'followers' 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>Followers</span>
                      </button>
                      <button
                        onClick={() => handlePrivacyChange('private')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          postPrivacy === 'private' 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Follower Selection for Private Posts */}
                  {showFollowerSelection && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Select followers:
                      </label>
                      <div className="max-h-32 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                        {followers.map((follower) => (
                          <label key={follower.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedFollowers.includes(follower.id)}
                              onChange={() => toggleFollowerSelection(follower.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {follower.fullName}
                            </span>
                          </label>
                        ))}
                      </div>
                      {selectedFollowers.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {selectedFollowers.length} selected
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <label className="cursor-pointer flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <Image className="w-5 h-5" />
                      <span className="text-sm">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowCreatePost(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddPost}
                        disabled={!newPost.trim() && !imagePreview}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <UserAvatar 
                    profilePicture={post.profilePicture}
                    authorName={post.author}
                    authorFullName={post.authorFullName}
                    size="w-10 h-10"
                    clickable={true}
                    userId={post.userId}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p 
                        className="font-semibold text-sm text-gray-900 hover:text-gray-600 cursor-pointer transition-colors"
                        onClick={() => {
                          console.log('Clicking on user:', post.authorFullName || post.author, 'UserID:', post.userId);
                          if (post.userId) {
                            // If clicking on own profile, go to /profile, otherwise go to /profile/[userId]
                            if (user && user.id === post.userId) {
                              console.log('Navigating to own profile');
                              router.push('/profile');
                            } else {
                              console.log('Navigating to user profile:', post.userId);
                              router.push(`/profile/${post.userId}`);
                            }
                          } else {
                            console.error('No userId available for this post');
                            alert('User profile not available');
                          }
                        }}
                      >
                        {post.authorFullName || post.author}
                      </p>
                      <div className="text-gray-400">
                        {getPrivacyIcon((post as any).privacy || 'public')}
                      </div>
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
                    onDoubleClick={() => {
                      // Double tap to like functionality
                      setPosts(prev => prev.map(p =>
                        p.id === post.id
                          ? {
                              ...p,
                              liked: !p.liked,
                              likes: p.liked ? p.likes - 1 : p.likes + 1
                            }
                          : p
                      ));
                      // Also call API to persist the like
                      api.toggleLike(post.id).catch(console.error);
                    }}
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
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
                                <span 
                                  className="font-semibold text-sm text-gray-900 hover:text-gray-600 cursor-pointer transition-colors"
                                  onClick={() => {
                                    console.log('Clicking on commenter:', comment.authorFullName || comment.author, 'UserID:', comment.userId);
                                    if (comment.userId) {
                                      // If clicking on own profile, go to /profile, otherwise go to /profile/[userId]
                                      if (user && user.id === comment.userId) {
                                        console.log('Navigating to own profile');
                                        router.push('/profile');
                                      } else {
                                        console.log('Navigating to commenter profile:', comment.userId);
                                        router.push(`/profile/${comment.userId}`);
                                      }
                                    } else {
                                      console.error('No userId available for this comment');
                                      alert('User profile not available');
                                    }
                                  }}
                                >
                                  {comment.authorFullName || comment.author}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 mt-1">{comment.text}</p>
                              {/* Comment Image */}
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
                              <button className="text-xs text-gray-500 font-medium hover:text-gray-700">
                                Like
                              </button>
                              <button className="text-xs text-gray-500 font-medium hover:text-gray-700">
                                Reply
                              </button>
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
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">Be the first to share something with your network!</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create your first post
            </button>
          </div>
        )}
      </div>
    </main>
  )
}