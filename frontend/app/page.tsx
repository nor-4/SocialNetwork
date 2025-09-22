import React from 'react'
import {Theme} from '@radix-ui/themes'

export default function HomePage() {
  return (
    <Theme appearance="light">
      <div className="min-h-screen bg-white text-gray-800">
        <main className="p-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to SocialNet</h1>
          <p className="text-gray-600 text-lg">Connect with friends, join groups, and chat in real-time.</p>
        </main>
      </div>
    </Theme>
  )
}
