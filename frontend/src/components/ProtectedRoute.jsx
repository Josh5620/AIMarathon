import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AccessModal.css'

export default function ProtectedRoute({ children }) {
  const { session, approved, loading, email, signOut } = useAuth()

  // While Supabase exchanges the OAuth ?code=... for a session, hold a
  // "signing in" state instead of flashing the login screen.
  const oauthInFlight = new URLSearchParams(window.location.search).has('code')

  if (loading || (oauthInFlight && !session)) return <div className="auth-status">Signing you in…</div>
  if (!session) return <Navigate to="/" replace />
  if (approved === null) return <div className="auth-status">Checking access…</div>

  if (approved === false) {
    return (
      <div className="access-denied">
        <h2>Access denied</h2>
        <p>
          <strong>{email}</strong> isn’t on the approved recruiter list.
        </p>
        <p className="access-denied-sub">
          Ask an admin to add your email, or sign in with a different account.
        </p>
        <button type="button" className="access-btn access-btn-primary" onClick={signOut}>
          Sign out
        </button>
      </div>
    )
  }

  return children
}
