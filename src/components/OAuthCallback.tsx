import { useEffect } from 'react'
import { useAuthStore, type User } from '../stores/authStore'

export function OAuthCallback() {
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')

    if (accessToken) {
      fetchUserInfo(accessToken).then((user) => {
        if (user) {
          login(user, accessToken)
          // Use base URL for GitHub Pages compatibility
          window.location.href = import.meta.env.BASE_URL || '/'
        }
      })
    }
  }, [login])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Signing in...</p>
      </div>
    </div>
  )
}

async function fetchUserInfo(accessToken: string): Promise<User | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!response.ok) return null
    const data = await response.json()
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  } catch {
    return null
  }
}
