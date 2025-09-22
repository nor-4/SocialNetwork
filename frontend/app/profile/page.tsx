'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Edit, X, Check, Camera, Grid, Bookmark, User, Settings, MoreHorizontal, Share } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { getUserInfo } from '@/hooks/Auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  nickname?: string;
  about?: string;
  public: boolean;
  profilePicture?: number;
  posts: {
    id: string;
    content: string;
    created_at: string;
    liked: boolean;
    likes: number;
    imagePath?: string;
    comments: {
      id: string;
      author: string;
      text: string;
      time: string;
    }[];
  }[];
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

type TabType = 'posts' | 'liked';

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [selectedPost, setSelectedPost] = useState<User['posts'][0] | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Load user's posts from API
    const loadUserPosts = async () => {
      try {
        const result = await api.getPosts();
        const userInfo = getUserInfo();
        
        if (userInfo && result.posts) {
          // Filter posts to show only current user's posts
          const userPosts = result.posts
            .filter(post => post.userId === userInfo.id)
            .map(post => ({
              id: post.id.toString(),
              content: post.content,
              created_at: post.createdAt,
              liked: post.liked,
              likes: post.likes,
              imagePath: post.imagePath,
              author: post.author,
              authorFullName: post.authorFullName,
              authorEmail: post.authorEmail,
              profilePicture: post.profilePicture,
              comments: [] // Comments will be loaded separately when needed
            }));
          
          // Update user data with actual posts
          setUser(prev => prev ? {
            ...prev,
            posts: userPosts,
            postsCount: userPosts.length
          } : null);
          
          // Load comments for each post
          await loadCommentsForPosts(userPosts);
        }
      } catch (error) {
        console.error('Failed to load user posts:', error);
        // Don't set error state, just log - posts are optional
      }
    };

    // Load user's liked posts from API
    const loadLikedPosts = async () => {
      try {
        const result = await api.getLikedPosts();
        
        if (result.posts) {
          const likedPostsData = result.posts.map(post => ({
            id: post.id.toString(),
            content: post.content,
            created_at: post.createdAt,
            liked: post.liked,
            likes: post.likes,
            imagePath: post.imagePath,
            author: post.author,
            authorFullName: post.authorFullName,
            authorEmail: post.authorEmail,
            profilePicture: post.profilePicture,
            comments: [] // Comments will be loaded separately when needed
          }));
          
          setLikedPosts(likedPostsData);
          
          // Load comments for each liked post
          await loadCommentsForPosts(likedPostsData, true);
        }
      } catch (error) {
        console.error('Failed to load liked posts:', error);
        // Don't set error state, just log - liked posts are optional
      }
    };

    // Load comments for posts
    const loadCommentsForPosts = async (posts: any[], isLikedPosts = false) => {
      for (const post of posts) {
        try {
          const commentsResult = await api.getComments(parseInt(post.id));
          if (commentsResult.comments) {
            // Update the post with comments
            if (isLikedPosts) {
              setLikedPosts(prev => 
                prev.map(p => 
                  p.id === post.id ? {
                    ...p,
                    comments: commentsResult.comments.map(comment => ({
                      id: comment.id.toString(),
                      author: comment.authorFullName,
                      text: comment.content,
                      time: comment.createdAt
                    }))
                  } : p
                )
              );
            } else {
              setActivePosts(prev => 
                prev.map(p => 
                  p.id === post.id ? {
                    ...p,
                    comments: commentsResult.comments.map(comment => ({
                      id: comment.id.toString(),
                      author: comment.authorFullName,
                      text: comment.content,
                      time: comment.createdAt
                    }))
                  } : p
                )
              );
            }
          }
        } catch (error) {
          console.error(`Failed to load comments for post ${post.id}:`, error);
        }
      }
    };

    // Load user data from localStorage (set during login/registration)
    const loadUserData = async () => {
      try {
        const userInfo = getUserInfo();
        if (userInfo) {
            setUser({
              id: userInfo.id,
              email: userInfo.email,
              firstName: userInfo.firstName,
              lastName: userInfo.lastName,
              dob: userInfo.dob,
              nickname: userInfo.nickname,
              about: userInfo.about || '',
              public: true, // Default for now
              profilePicture: userInfo.profilePicture,
              posts: [], // Will be loaded separately
              postsCount: 42,
              followersCount: 156,
              followingCount: 128
            });
            
            // Load user's posts
            await loadUserPosts();
            
            // Load user's liked posts
            await loadLikedPosts();
        } else {
          setError('User information not found. Please log in again.');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user information.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, router]);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<User | null>(null);
  const [activePosts, setActivePosts] = useState<User['posts']>([]);
  const [likedPosts, setLikedPosts] = useState<User['posts']>([]);
  const [newComment, setNewComment] = useState('');
  const [commentPostId, setCommentPostId] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Update edit data and posts when user data is loaded
  useEffect(() => {
    if (user) {
      setEditData(user);
      setActivePosts(user.posts);
      // Set default avatar if no profile picture
      setAvatarPreview(user.profilePicture ? `http://localhost:8080/file?id=${user.profilePicture}` : 'https://via.placeholder.com/100x100?text=No+Image');
    }
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </main>
    );
  }

  // Show error state
  if (error || !user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load profile'}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const getCurrentPosts = () => {
    return activeTab === 'posts' ? activePosts : likedPosts;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const toggleLike = async (postId: string) => {
    try {
      const result = await api.toggleLike(parseInt(postId));
      
      // Update both activePosts and likedPosts if the post exists in them
      setActivePosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                liked: result.liked,
                likes: result.likeCount,
              }
            : post
        )
      );
      
      setLikedPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                liked: result.liked,
                likes: result.likeCount,
              }
            : post
        )
      );
      
      // If we're on the liked posts tab and the post was unliked, remove it
      if (activeTab === 'liked' && !result.liked) {
        setLikedPosts(prev => prev.filter(post => post.id !== postId));
      }
      
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Fallback to local state update
      const updateFunction = (prev: User['posts']) =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                liked: !post.liked,
                likes: post.liked ? post.likes - 1 : post.likes + 1,
              }
            : post
        );
      
      setActivePosts(updateFunction);
      setLikedPosts(updateFunction);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !user) return;

    try {
      const result = await api.createComment(parseInt(postId), newComment);
      
      const newCommentData = {
        id: result.id.toString(),
        author: result.authorFullName,
        text: result.content,
        time: result.createdAt,
      };
      
      // Add the new comment to both activePosts and likedPosts if the post exists in them
      const updateFunction = (prev: User['posts']) =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: [...post.comments, newCommentData],
              }
            : post
        );
      
      setActivePosts(updateFunction);
      setLikedPosts(updateFunction);
      
    } catch (error) {
      console.error('Failed to create comment:', error);
      // Fallback to local state update
      const currentUserName = `${user.firstName} ${user.lastName}`;
      const fallbackComment = {
        id: `c${Date.now()}`,
        author: currentUserName,
        text: newComment,
        time: new Date().toISOString(),
      };
      
      const updateFunction = (prev: User['posts']) =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: [...post.comments, fallbackComment],
              }
            : post
        );
      
      setActivePosts(updateFunction);
      setLikedPosts(updateFunction);
    }
    
    setNewComment('');
    setCommentPostId('');
  };

  const toggleComments = (postId: string) => {
    setCommentPostId(commentPostId === postId ? '' : postId);
  };

  const handleEditClick = () => {
    if (user) {
      setEditData(user);
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    if (editData) {
      setUser(editData);
      // TODO: Save to backend API
      console.log('Saving user data:', editData);
    }
    setEditMode(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editData) {
      setEditData(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        return;
      }
      
      setUploadingAvatar(true);
      
      try {
        // Upload avatar using the API
        const result = await api.updateAvatar(file);
        
        // Update the avatar preview and user data
        setAvatarPreview(result.imageUrl);
        setUser(prev => prev ? {
          ...prev,
          profilePicture: result.imageId
        } : null);
        
        console.log('Avatar uploaded successfully:', result);
        alert('Avatar updated successfully!');
      } catch (error) {
        console.error('Avatar upload failed:', error);
        alert(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };
  
  const handleAvatarClick = () => {
    // Trigger file input click
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header - Instagram Style */}
        <div className="flex flex-col md:flex-row md:items-start md:space-x-12 space-y-8 md:space-y-0 mb-12">
          {/* Profile Picture */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div 
                className="relative cursor-pointer group"
                onClick={handleAvatarClick}
                title="Click to change avatar"
              >
                {user.profilePicture ? (
                  <img
                    src={`http://localhost:8080/file?id=${user.profilePicture}`}
                    alt="Profile avatar"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-200 object-cover transition-opacity group-hover:opacity-75"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-200 bg-gray-200 flex items-center justify-center transition-opacity group-hover:opacity-75">
                    <User className="w-16 h-16 md:w-20 md:h-20 text-gray-500" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-6">
            {editMode && editData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="nickname"
                    value={editData.nickname || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    name="about"
                    value={editData.about || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Tell people about yourself..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Username and Actions */}
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                  <h1 className="text-2xl font-light">
                    {user.nickname || `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`}
                  </h1>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEditClick}
                      className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-sm transition-colors"
                    >
                      Edit profile
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex space-x-8">
                  <div className="text-center md:text-left">
                    <span className="block text-xl font-semibold">{user.postsCount}</span>
                    <span className="text-gray-600 text-sm">posts</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block text-xl font-semibold">{user.followersCount}</span>
                    <span className="text-gray-600 text-sm">followers</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block text-xl font-semibold">{user.followingCount}</span>
                    <span className="text-gray-600 text-sm">following</span>
                  </div>
                </div>

                {/* Name and Bio */}
                <div className="space-y-1">
                  <h2 className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h2>
                  {user.about && (
                    <p className="text-gray-700 whitespace-pre-line">{user.about}</p>
                  )}
                </div>
              </>
            )}
                    
            {/* Post Modal - Instagram Style */}
            {showPostModal && selectedPost && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowPostModal(false)}>
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  {/* Image Section */}
                  <div className="flex-1 bg-black flex items-center justify-center">
                    {selectedPost.imagePath ? (
                      <img 
                        src={`http://localhost:8080${selectedPost.imagePath}`}
                        alt="Post"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-center p-8">
                        <p className="text-gray-700 text-lg font-medium">{selectedPost.content}</p>
                      </div>
                    )}
                  </div>
                          
                  {/* Content Section */}
                  <div className="w-96 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.profilePicture ? `http://localhost:8080/file?id=${user.profilePicture}` : 'https://via.placeholder.com/32x32?text=User'}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="font-semibold text-sm">{user.firstName} {user.lastName}</span>
                      </div>
                      <button onClick={() => setShowPostModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                      </button>
                    </div>
                            
                    {/* Content */}
                    {selectedPost.imagePath && (
                      <div className="p-4 border-b">
                        <p className="text-gray-900">{selectedPost.content}</p>
                        <p className="text-gray-500 text-xs mt-2">{formatTime(selectedPost.created_at)}</p>
                      </div>
                    )}
                            
                    {/* Comments */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedPost.comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                          <div className="flex-1">
                            <div className="flex items-start space-x-2">
                              <span className="font-semibold text-sm">{comment.author}</span>
                              <span className="text-sm text-gray-900">{comment.text}</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-1">{formatTime(comment.time)}</p>
                          </div>
                        </div>
                      ))}
                      {selectedPost.comments.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No comments yet</p>
                      )}
                    </div>
                            
                    {/* Actions */}
                    <div className="border-t p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => toggleLike(selectedPost.id)}
                            className={`${selectedPost.liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors`}
                          >
                            <Heart className={`w-6 h-6 ${selectedPost.liked ? 'fill-current' : ''}`} />
                          </button>
                          <button className="text-gray-600 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                              
                      <p className="text-sm font-semibold mb-2">{selectedPost.likes} likes</p>
                              
                      {/* Add Comment */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border-0 focus:outline-none text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(selectedPost.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(selectedPost.id)}
                          disabled={!newComment.trim()}
                          className="text-blue-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        {!editMode && (
          <>
            <div className="border-t border-gray-200">
              <div className="flex justify-center space-x-16 pt-4">
                <button
                  onClick={() => handleTabChange('posts')}
                  className={`flex items-center space-x-1 pb-1 border-t-2 font-medium text-sm ${
                    activeTab === 'posts'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid size={12} />
                  <span>POSTS</span>
                </button>
                <button
                  onClick={() => handleTabChange('liked')}
                  className={`flex items-center space-x-1 pb-1 border-t-2 font-medium text-sm ${
                    activeTab === 'liked'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Heart size={12} />
                  <span>LIKED POSTS</span>
                </button>
              </div>
            </div>

            {/* Posts List - Same as Posts Page */}
            <div className="mt-8">
              {activeTab === 'posts' && (
                activePosts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">When you share posts, they will appear on your profile.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activePosts.map((post) => (
                      <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                        {/* Post Header */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-3">
                            {post.profilePicture ? (
                              <img
                                src={`http://localhost:8080/file?id=${post.profilePicture}`}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-sm text-gray-900">
                                  {post.authorFullName || post.author}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">{formatTime(post.created_at)}</p>
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
                        {commentPostId === post.id && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            {post.comments.length > 0 && (
                              <div className="space-y-3 mb-4 mt-4">
                                {post.comments.map((comment) => (
                                  <div key={comment.id} className="flex space-x-3">
                                    {comment.profilePicture ? (
                                      <img
                                        src={`http://localhost:8080/file?id=${comment.profilePicture}`}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-500" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                          <span className="font-semibold text-sm text-gray-900">
                                            {comment.author}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-800 mt-1">{comment.text}</p>
                                      </div>
                                      <div className="flex items-center space-x-3 mt-1 px-3">
                                        <span className="text-xs text-gray-500">{formatTime(comment.time)}</span>
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
                              {user.profilePicture ? (
                                <img
                                  src={`http://localhost:8080/file?id=${user.profilePicture}`}
                                  alt="Profile"
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
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
                )
              )}
              
              {activeTab === 'liked' && (
                likedPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No liked posts yet</h3>
                    <p className="text-gray-500">Posts you like will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {likedPosts.map((post) => (
                      <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                        {/* Post Header */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-3">
                            {post.profilePicture ? (
                              <img
                                src={`http://localhost:8080/file?id=${post.profilePicture}`}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-sm text-gray-900">
                                  {post.authorFullName || post.author}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">{formatTime(post.created_at)}</p>
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
                        {commentPostId === post.id && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            {post.comments.length > 0 && (
                              <div className="space-y-3 mb-4 mt-4">
                                {post.comments.map((comment) => (
                                  <div key={comment.id} className="flex space-x-3">
                                    {comment.profilePicture ? (
                                      <img
                                        src={`http://localhost:8080/file?id=${comment.profilePicture}`}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-500" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                          <span className="font-semibold text-sm text-gray-900">
                                            {comment.author}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-800 mt-1">{comment.text}</p>
                                      </div>
                                      <div className="flex items-center space-x-3 mt-1 px-3">
                                        <span className="text-xs text-gray-500">{formatTime(comment.time)}</span>
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
                              {user.profilePicture ? (
                                <img
                                  src={`http://localhost:8080/file?id=${user.profilePicture}`}
                                  alt="Profile"
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
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
                )
              )}
            </div>
            
            {/* Post Detail Modal */}
            {selectedPost && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPost(null)}>
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
                  {/* Post Image/Content */}
                  <div className="flex-1 bg-black flex items-center justify-center">
                    {selectedPost.imagePath ? (
                      <img 
                        src={`http://localhost:8080${selectedPost.imagePath}`}
                        alt="Post"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                        <p className="text-gray-800 text-lg font-medium text-center p-8 leading-relaxed">{selectedPost.content}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Post Details Sidebar */}
                  <div className="w-80 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.profilePicture ? `http://localhost:8080/file?id=${user.profilePicture}` : 'https://via.placeholder.com/40x40?text=User'}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-semibold text-sm">{user.firstName} {user.lastName}</h4>
                          <p className="text-gray-500 text-xs">{formatTime(selectedPost.created_at)}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPost(null)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    {/* Post Content (if there's an image) */}
                    {selectedPost.imagePath && (
                      <div className="p-4 border-b">
                        <p className="text-gray-900 text-sm leading-relaxed">{selectedPost.content}</p>
                      </div>
                    )}
                    
                    {/* Comments */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedPost.comments.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No comments yet</p>
                      ) : (
                        selectedPost.comments.map((comment) => (
                          <div key={comment.id} className="flex space-x-3">
                            <div className="flex-1">
                              <div className="flex items-start space-x-2">
                                <span className="font-semibold text-sm">{comment.author}</span>
                                <span className="text-gray-900 text-sm">{comment.text}</span>
                              </div>
                              <p className="text-gray-500 text-xs mt-1">{formatTime(comment.time)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="border-t p-4 space-y-3">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleLike(selectedPost.id)}
                          className={`flex items-center space-x-2 ${selectedPost.liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors`}
                        >
                          <Heart className={`w-6 h-6 ${selectedPost.liked ? 'fill-current' : ''}`} />
                          <span className="font-medium">{selectedPost.likes}</span>
                        </button>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MessageCircle className="w-6 h-6" />
                          <span className="font-medium">{selectedPost.comments.length}</span>
                        </div>
                      </div>
                      
                      {/* Add Comment */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(selectedPost.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(selectedPost.id)}
                          disabled={!newComment.trim()}
                          className="px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}