import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, approved, loading, email, signOut } = useAuth()

  const oauthInFlight = new URLSearchParams(window.location.search).has('code')

  if (loading || (oauthInFlight && !session)) return (
    <div className="flex items-center justify-center min-h-screen text-body-md text-on-surface-variant">
      Signing you in…
    </div>
  )
  if (!session) return <Navigate to="/" replace />
  if (approved === null) return (
    <div className="flex items-center justify-center min-h-screen text-body-md text-on-surface-variant">
      Checking access…
    </div>
  )

  if (approved === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-page-margin text-center">
        <span className="material-symbols-outlined text-[48px] text-error mb-md">lock</span>
        <h2 className="text-headline-md font-bold text-on-surface mb-sm">Access Denied</h2>
        <p className="text-body-md text-on-surface-variant mb-xs">
          <strong>{email}</strong> isn't on the approved recruiter list.
        </p>
        <p className="text-meta text-on-surface-variant mb-lg">
          Ask an admin to add your email, or sign in with a different account.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-[6px] bg-primary hover:bg-accent-hover text-on-primary font-semibold text-[0.78rem] px-[14px] py-[6px] rounded-none transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign out
        </button>
      </div>
    )
  }

  return children
}
