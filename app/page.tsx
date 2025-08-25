"use client"

import { useState, useEffect } from "react"

import ChatView from "@/components/modern-chat-view"

import dynamic from "next/dynamic"

// Use dynamic import with SSR disabled to avoid Matrix SDK issues during server rendering
const DynamicLoginView = dynamic(() => import("@/components/modern-login-view"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen gradient-subtle dark:gradient-subtle-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-altx-200 border-t-altx-500"></div>
        <p className="text-sm text-muted-foreground">Loading CLIX Platform...</p>
      </div>
    </div>
  )
})

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing Matrix credentials on component mount (client-side only)
  useEffect(() => {
    // Check if user is already logged in
    const accessToken = localStorage.getItem("matrix_access_token")
    const userId = localStorage.getItem("matrix_user_id")
    const homeServer = localStorage.getItem("matrix_home_server")

    if (accessToken && userId && homeServer) {
      setIsLoggedIn(true)
    }

    setIsLoading(false)
  }, [])

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-subtle dark:gradient-subtle-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-altx-200 border-t-altx-500"></div>
          <p className="text-sm text-muted-foreground">Loading CLIX Platform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {!isLoggedIn ? 
        <DynamicLoginView onLoginSuccess={handleLoginSuccess} /> : 
        <ChatView />
      }
    </div>
  )
}
