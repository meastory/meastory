import Auth from '../components/Auth'
import MenuPanel from '../components/MenuPanel'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuthStore()

  const params = new URLSearchParams(location.search)
  const redirect = params.get('redirect') || '/'

  useEffect(() => {
    if (session) {
      navigate(redirect, { replace: true })
    }
  }, [session, redirect])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="absolute top-4 right-4 z-[1101]">
        <MenuPanel />
      </div>
      <Auth onAuthSuccess={() => navigate(redirect, { replace: true })} mode="login" showToggle={false} />
    </div>
  )
}