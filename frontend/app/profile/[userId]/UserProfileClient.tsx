'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, MessageCircle, User, Grid, UserPlus, UserMinus, Lock, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { api } from '@/lib/api';

type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  about?: string;
  profilePicture?: number;
  isPublic: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  liked: boolean;
  likes: number;
  imagePath?: string;
  author: string;
  authorFullName: string;
  profilePicture?: number;
  privacy: string;
  comments: Comment[];
};

type Comment = {
  id: string;
  author: string;
  text: string;
  time: string;
  profilePicture?: number;
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

export default function UserProfileClient() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  console.log('UserProfilePage loaded with params:', params);
  console.log('UserId from params:', userId);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentPostId, setCommentPostId] = useState('');
  const [newComment, setNewComment] = useState('');

  const isOwnProfile = currentUser?.id.toString() === userId;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isOwnProfile) {
      router.push('/profile');
      return;
    }

    loadUserProfile();
  }, [isAuthenticated, userId, isOwnProfile, router]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Load user profile data
      const profileResponse = await api.getUserProfile(parseInt(userId));
      const profileData: UserProfile = {
        id: profileResponse.id,
        email: profileResponse.email,
        firstName: profileResponse.firstName,
        lastName: profileResponse.lastName,
        nickname: profileResponse.nickname,
        about: profileResponse.about,
        profilePicture: profileResponse.profilePicture,
        isPublic: profileResponse.isPublic,
        isFollowing: profileResponse.isFollowing,
        followersCount: profileResponse.followersCount,
        followingCount: profileResponse.followingCount,
        postsCount: profileResponse.postsCount
      };
      
      setProfile(profileData);
      setIsFollowing(profileData.isFollowing);

      // Load posts based on privacy and follow status
      if (profileData.isPublic || profileData.isFollowing) {
        await loadUserPosts();
      }

    } catch (error) {
      console.error('Failed to load user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const response = await api.getUserPosts(parseInt(userId));
      const formattedPosts = response.posts.map((post: any): Post => ({
        id: post.id.toString(),
        content: post.content,
        created_at: post.createdAt,
        liked: post.liked,
        likes: post.likes,
        imagePath: post.imagePath,
        author: post.author,
        authorFullName: post.authorFullName,
        profilePicture: post.profilePicture,
        privacy: post.privacy,
        comments: []
      }));
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile) return;
    
    setFollowLoading(true);
    try {
      const response = await api.toggleFollow(profile.id);
      setIsFollowing(response.isFollowing);
      
      // Update profile data
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: response.isFollowing,
        followersCount: response.isFollowing 
          ? prev.followersCount + 1 
          : prev.followersCount - 1
      } : null);

      // If we unfollowed and profile is private, clear posts
      if (!response.isFollowing && !profile.isPublic) {
        setPosts([]);
      } else if (response.isFollowing) {
        // If we just followed, load posts
        await loadUserPosts();
      }

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      alert('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      const response = await api.toggleLike(parseInt(postId));
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              liked: response.liked,
              likes: response.likeCount
            }
          : post
      ));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const toggleComments = (postId: string) => {
    setCommentPostId(commentPostId === postId ? '' : postId);
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      const result = await api.createComment(parseInt(postId), newComment);
      
      const newCommentData = {
        id: result.id.toString(),
        author: result.authorFullName,
        text: result.content,
        time: result.createdAt,
        profilePicture: result.profilePicture
      };
      
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, newCommentData]
            }
          : post
      ));
      
      setNewComment('');
      
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to create comment');
    }
  };

  const canViewContent = () => {
    if (!profile) return false;
    return profile.isPublic || profile.isFollowing;
  };

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

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
          <button 
            onClick={() => router.push('/posts')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Posts
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-start md:space-x-12 space-y-8 md:space-y-0 mb-12">
          {/* Profile Picture */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              {profile.profilePicture ? (
                <img
                  src={`http://localhost:8080/file?id=${profile.profilePicture}`}
                  alt="Profile avatar"
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-200 object-cover"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-200 bg-gray-200 flex items-center justify-center">
                  <User className="w-16 h-16 md:w-20 md:h-20 text-gray-500" />
                </div>
              )}
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
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${
                    isFollowing
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex space-x-8">
              <div className="text-center md:text-left">
                <span className="block text-xl font-semibold">{profile.postsCount}</span>
                <span className="text-gray-600 text-sm">posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-semibold">{profile.followersCount}</span>
                <span className="text-gray-600 text-sm">followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-semibold">{profile.followingCount}</span>
                <span className="text-gray-600 text-sm">following</span>
              </div>
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
          {canViewContent() ? (
            <>
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
                      {profile.firstName} hasn't shared any posts yet.
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                      {/* Post Header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/profile/${profile.id}`)}
                          >
                            {post.profilePicture ? (
                              <img
                                src={`http://localhost:8080/file?id=${post.profilePicture}`}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p 
                                className="font-semibold text-sm text-gray-900 hover:text-gray-600 cursor-pointer transition-colors"
                                onClick={() => router.push(`/profile/${profile.id}`)}
                              >
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
                                  <div
                                    className="cursor-pointer"
                                    onClick={() => {
                                      // Navigate to commenter's profile - we'll need to get userId from comment
                                      console.log('Navigate to commenter profile');
                                    }}
                                  >
                                    {comment.profilePicture ? (
                                      <img
                                        src={`http://localhost:8080/file?id=${comment.profilePicture}`}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                                        <User className="w-5 h-5 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start space-x-2">
                                        <span 
                                          className="font-semibold text-sm text-gray-900 hover:text-gray-600 cursor-pointer transition-colors"
                                          onClick={() => {
                                            // Navigate to commenter's profile - we'll need to get userId from comment
                                            console.log('Navigate to commenter profile');
                                          }}
                                        >
                                          {comment.author}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-800 mt-1">{comment.text}</p>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-1 px-3">
                                      <span className="text-xs text-gray-500">{formatTime(comment.time)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Add Comment Input */}
                          <div className="flex items-center space-x-3 pt-3 mt-3 border-t border-gray-100">
                            {currentUser?.profilePicture ? (
                              <img
                                src={`http://localhost:8080/file?id=${currentUser.profilePicture}`}
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
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Private Account</h3>
              <p className="text-gray-500 mb-4">
                Follow @{profile.nickname || profile.firstName} to see their posts.
              </p>
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {followLoading ? 'Loading...' : 'Follow'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}