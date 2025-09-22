/*
 * API Client for Social Network Frontend
 * 
 * All profile-related API endpoints are now implemented and connected to the backend database:
 * - get_user_profile: Fetches real user profile data from database
 * - get_user_posts: Fetches user's posts (currently returns empty array - to be enhanced)
 * - toggle_follow: Handles follow/unfollow functionality (currently returns mock data - to be enhanced)
 */

const API_BASE = 'http://localhost:8080/api';
import { getAuthToken } from '@/hooks/Auth';

export interface Post {
  id: number;
  userId: number;
  author: string;
  authorFullName: string;
  authorEmail: string;
  profilePicture: number;
  content: string;
  imageId?: number;
  imagePath?: string;
  privacy: string;
  createdAt: string;
  liked: boolean;
  likes: number;
  comments: number;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  author: string;
  authorFullName: string;
  profilePicture: number;
  content: string;
  imageId?: number;
  imagePath?: string;
  createdAt: string;
}

export interface CreatePostRequest {
  content: string;
  imageData?: string;
  imageFilename?: string;
  imageMimetype?: string;
  privacy?: string;
  selectedFollowers?: number[];
}

export interface CreateCommentRequest {
  postId: number;
  content: string;
  imageData?: string;
  imageFilename?: string;
  imageMimetype?: string;
}

export interface FollowRequest {
  id: number;
  followerId: number;
  followerName: string;
  followerNick: string;
  profilePicture: number;
  createdAt: string;
}

export const api = {
  // Debug function to check localStorage contents
  debugAuth: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('token');
      console.log('LocalStorage token:', stored);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('Parsed token data:', parsed);
          console.log('Token field:', parsed.token);
          console.log('User field:', parsed.user);
          
          // Test if token looks like valid base64
          if (parsed.token) {
            console.log('Token length:', parsed.token.length);
            console.log('Token first 50 chars:', parsed.token.substring(0, 50));
            // Try to decode to check if it's valid base64
            try {
              atob(parsed.token);
              console.log('✓ Token appears to be valid base64');
            } catch (e) {
              console.error('✗ Token is not valid base64:', e);
            }
          }
        } catch (e) {
          console.error('Failed to parse stored token:', e);
        }
      } else {
        console.log('No token found in localStorage');
      }
    }
    return getAuthToken();
  },

  // Get authentication token
  getToken: (): string | null => {
    return getAuthToken();
  },

  // Create a new post with enhanced options
  createPost: async (content: string, privacy: string = 'public', imageFile?: File, selectedFollowers?: number[]): Promise<Post> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    let imageData, imageFilename, imageMimetype;
    
    if (imageFile) {
      // Convert image to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      
      imageData = base64Data;
      imageFilename = imageFile.name;
      imageMimetype = imageFile.type;
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_post',
          content,
          privacy,
          imageData,
          imageFilename,
          imageMimetype,
          selectedFollowers
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create post: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Get all posts
  getPosts: async (): Promise<{ posts: Post[] }> => {
    const token = api.getToken();
    console.log('Token for getPosts:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          action: 'get_posts'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Failed to fetch posts: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Get liked posts
  getLikedPosts: async (): Promise<{ posts: Post[] }> => {
    const token = api.getToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_liked_posts'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch liked posts: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Toggle like on a post
  toggleLike: async (postId: number): Promise<{ liked: boolean; likeCount: number }> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'toggle_like',
        postId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to toggle like');
    }

    return response.json();
  },

  // Create a comment with optional image
  createComment: async (postId: number, content: string, imageFile?: File): Promise<Comment> => {
    let imageData, imageFilename, imageMimetype;
    
    if (imageFile) {
      // Convert image to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      
      imageData = base64Data;
      imageFilename = imageFile.name;
      imageMimetype = imageFile.type;
    }

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'create_comment',
        postId,
        content,
        imageData,
        imageFilename,
        imageMimetype
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create comment');
    }

    return response.json();
  },

  // Get comments for a post
  getComments: async (postId: number): Promise<{ comments: Comment[] }> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'get_comments',
        postId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }

    return response.json();
  },

  // Get user's followers for private post selection
  getFollowers: async (): Promise<{ followers: any[] }> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'get_followers'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch followers');
    }

    return response.json();
  },

  // Get followers for a specific user
  getFollowers: async (userId?: number): Promise<{ followers: any[] }> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'get_followers',
        ...(userId && { userId })
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch followers');
    }

    return response.json();
  },

  // Get following for a specific user
  getFollowing: async (userId?: number): Promise<{ following: any[] }> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.getToken()}`
      },
      body: JSON.stringify({
        action: 'get_following',
        ...(userId && { userId })
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch following');
    }

    return response.json();
  },

  // Update user profile
  updateProfile: async (profileData: {
    firstName: string;
    lastName: string;
    nickname: string;
    about: string;
    isPublic: boolean;
  }): Promise<any> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_profile',
          ...profileData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update profile: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Update user avatar
  updateAvatar: async (imageFile: File): Promise<{ imageId: number; imageUrl: string }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
          
          const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
              action: 'upload_avatar',
              imageData: base64Data,
              imageFilename: imageFile.name,
              imageMimetype: imageFile.type
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload avatar: ${response.status} ${errorText}`);
          }

          const result = await response.json();
          resolve({
            imageId: result.imageId,
            imageUrl: `/file?id=${result.imageId}`
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(imageFile);
    });
  },

  // Get user profile by ID
  getUserProfile: async (userId: number): Promise<any> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_user_profile',
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Get user posts by ID
  getUserPosts: async (userId: number): Promise<{ posts: Post[] }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_user_posts',
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user posts: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Toggle follow/unfollow user
  toggleFollow: async (userId: number): Promise<{ isFollowing: boolean }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'toggle_follow',
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to toggle follow: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Get follow requests for the authenticated user
  getFollowRequests: async (): Promise<{ requests: FollowRequest[] }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_follow_requests'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch follow requests: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Accept a follow request
  acceptFollowRequest: async (requestId: number): Promise<{ message: string }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'accept_follow_request',
          requestId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to accept follow request: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Decline a follow request
  declineFollowRequest: async (requestId: number): Promise<{ message: string }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'decline_follow_request',
          requestId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to decline follow request: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  },

  // Get notifications for the authenticated user
  getNotifications: async (limit: number = 20): Promise<{ notifications: any[]; unreadCount: number }> => {
    const token = api.getToken();
    if (!token) {
      // Return empty data instead of throwing an error
      return { notifications: [], unreadCount: 0 };
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_notifications',
          limit
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Log the error for debugging but don't throw immediately
        console.error(`Failed to fetch notifications: ${response.status} ${errorText}`);
        // Return empty data instead of throwing an error to prevent UI crashes
        return { notifications: [], unreadCount: 0 };
      }

      const result = await response.json();
      
      // Ensure we always return the expected structure
      return {
        notifications: Array.isArray(result.notifications) ? result.notifications : [],
        unreadCount: typeof result.unreadCount === 'number' ? result.unreadCount : 0
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
        // Return empty data instead of throwing an error to prevent UI crashes
        return { notifications: [], unreadCount: 0 };
      }
      // For other errors, still return empty data to prevent UI crashes
      console.error('Error fetching notifications:', error);
      return { notifications: [], unreadCount: 0 };
    }
  },

  // Mark a notification as read
  markNotificationRead: async (notificationId: number): Promise<{ message: string }> => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'mark_notification_read',
          notificationId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark notification as read: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      }
      throw error;
    }
  }
};