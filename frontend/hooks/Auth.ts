'use client'

import { NextRouter } from "next/router"

// import {NextRouter, useRouter} from 'next/router'

const API_BASE_URL = 'http://localhost:8080'

type UserInfo = {
  id: number
  nickname: string
  email: string
  firstName: string
  lastName: string
  gender: string
  dob: string
  about?: string
  profilePicture?: number
}

export const UserInfo: UserInfo = {
  id: 0,
  nickname: '',
  email: '',
  firstName: '',
  lastName: '',
  gender: '',
  dob: '',
}

export async function Login(email: string, password: string): Promise<{UserInfo?: UserInfo; error?: string}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include', // Include cookies
      body: JSON.stringify({action: 'login', email, password}),
    })

    const data = await response.json()
    
    // Store user data and token for backward compatibility
    localStorage.setItem('token', JSON.stringify(data))
    console.log(data)

    if (!response.ok) {
      return {error: data.error || data.message || 'Login failed'}
    }

    if (!data.token) {
      return {error: 'Token missing in the response'}
    }

    console.log('Login successful - session cookie should be set by server')
    return {UserInfo: data.user}
  } catch (error: any) {
    console.error('Login error:', error)
    return {error: error.message || 'An unexpected error occurred during login.'}
  }
}

type RegisterParams = {
  User: {
    Public: boolean
    Email: string
    FirstName: string
    LastName: string
    Gender?: number
    Dob: string
    Nickname: string
    About: string
  }
  Password: string
  ImageFilename?: string
  ImageMimetype?: string
  ImageData?: string
}

export async function Register(request: RegisterParams): Promise<{UserInfo?: UserInfo; error?: string}> {
  try {
    request = Object.assign(request, {action: 'signup'})

    const response = await fetch(`${API_BASE_URL}/api`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include', // Include cookies
      body: JSON.stringify(request),
    })

    if (!response!.ok) {
      const errorData = await response.json()
      return {error: errorData.error || errorData.message || 'Register failed'}
    }

    const data = await response!.json()
    localStorage.setItem('token', JSON.stringify(data))
    console.log(data)

    if (!data.token) {
      return {error: 'Token missing in the response'}
    }

    console.log('Registration successful - session cookie should be set by server')
    return {UserInfo: data.user}
  } catch (error: any) {
    console.error('Register error:', error)
    return {error: error.message || 'An unexpected error occurred during login.'}
  }
}

export function Logout(): void {
  // Call logout API to clear server session
  fetch(`${API_BASE_URL}/api`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({action: 'logout'}),
  }).catch(error => {
    console.error('Logout API call failed:', error)
  })
  
  // Clear local storage
  localStorage.clear()
  cache = null
  console.log('Logged out - session cleared')
}

// Clear cache and force re-authentication
export function clearAuthCache(): void {
  cache = null
}

export function isUserLoggedIn(): boolean {
  return !!getAuthToken()
}

let cache: any = null

export function getAuthToken(): string | null {
  if (cache) return cache
  if (typeof window != 'undefined') {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    try {
      const parsed = JSON.parse(token)
      cache = parsed.token || null
      return cache
    } catch (e) {
      console.error('Failed to parse token:', e)
      return null
    }
  }

  return null
}

export function getUserInfo(): UserInfo | null {
  const storedData = localStorage.getItem('token')
  if (!storedData) return null
  try {
    const parsed = JSON.parse(storedData)
    return parsed.user || null
  } catch (e) {
    console.error('Failed to parse stored user data:', e)
    return null
  }
}

export async function apiRequest<T>(endpoint: string, body?: any, method: string = 'POST'): Promise<T> {
  const authToken = getAuthToken()
  const headers: {[key: string]: string} = {
    'Content-Type': 'application/json',
    ...(authToken ? {Authorization: `Bearer ${authToken}`} : {}),
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      credentials: 'include', // Include cookies for session-based auth
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('API request error:', error)
    throw error
  }
}

export async function createPost(postData: {content: string; image?: string}): Promise<any> {
    return await apiRequest('/api', { action: 'create_post', ...postData });
}

export async function getPosts(): Promise<any> {
    return await apiRequest('/api', { action: 'get_posts' });
}

export async function createComment(commentData: {postId: number; content: string}): Promise<any> {
    return await apiRequest('/api', { action: 'create_comment', ...commentData });
}

export async function getComments(postId: number): Promise<any> {
    return await apiRequest('/api', { action: 'get_comments', postId });
}

export async function toggleLike(postId: number): Promise<any> {
    return await apiRequest('/api', { action: 'toggle_like', postId });
}

function useEffect(arg0: () => void, arg1: NextRouter[]) {
  throw new Error('Function not implemented.')
}
