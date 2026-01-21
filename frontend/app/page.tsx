'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import Login from '@/components/Login'
import { useAuthStore } from '@/store/authStore'

export default function Home() {
  const { token, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    if (!token && !isAuthenticated) {
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [token, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {isAuthenticated ? <Dashboard /> : <Login />}
    </main>
  )
}
