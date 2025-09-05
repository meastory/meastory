import Auth from '../components/Auth'
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

  return <Auth onAuthSuccess={() => navigate(redirect, { replace: true })} mode="login" showToggle={false} />
}