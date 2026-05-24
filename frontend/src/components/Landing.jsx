import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AccessModal.css'

export default function Landing() {
  const { session, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  if (loading) return (
    <div className="login-page">
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>Loading…</div>
    </div>
  )

  if (session) return <Navigate to="/recruiter" replace />

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Intelligent Recruiter</h1>
        <p className="access-sub">How would you like to continue?</p>
        <button
          type="button"
          className="access-btn access-btn-primary"
          onClick={() => signInWithGoogle()}
        >
          <img src="/google.svg" alt="Google" className="access-g-icon" />
          Login as Recruiter
        </button>
        <button
          type="button"
          className="access-btn access-btn-ghost"
          onClick={() => navigate('/candidate')}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  )
}
