import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AccessModal.css'

export default function AccessModal() {
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()

  return (
    <div className="access-overlay" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="access-card">
        <h2 id="access-title" className="access-title">Welcome</h2>
        <p className="access-sub">How would you like to continue?</p>

        <button
          type="button"
          className="access-btn access-btn-primary"
          onClick={() => signInWithGoogle()}
        >
          <img src="/ri_google-fill.svg" alt="Google" className="access-g-icon" />
          Recruiter login with Google
        </button>

        <button
          type="button"
          className="access-btn access-btn-ghost"
          onClick={() => navigate('/candidate')}
        >
          Continue as guest (candidate)
        </button>
      </div>
    </div>
  )
}
