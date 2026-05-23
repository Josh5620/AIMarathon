import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AccessModal from './AccessModal'

export default function Landing() {
  const { session, loading } = useAuth()
  if (loading) return <div className="auth-status">Loading…</div>
  if (session) return <Navigate to="/recruiter" replace />
  return <AccessModal />
}
