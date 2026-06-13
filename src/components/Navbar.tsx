'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const { user } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/meetings" className="text-lg font-bold text-black tracking-tight">
        Jolly Summary
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              로그아웃
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
