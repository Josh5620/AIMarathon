import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { checkHealth } from './api'
import { useAuth } from './auth/AuthContext'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import PostingFormPage from './pages/PostingFormPage'
import PostingCandidatesPage from './pages/PostingCandidatesPage'
import PostingReportPage from './pages/PostingReportPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import Landing from './components/Landing'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import RecruiterLayout from './components/RecruiterLayout'
import ProtectedRoute from './components/ProtectedRoute'

function GuestRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/recruiter" replace />
  return children
}

export default function App() {
  const [backendUp, setBackendUp] = useState(null)
  const location = useLocation()

  useEffect(() => {
    checkHealth().then(setBackendUp)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {backendUp === false && (
        <div className="px-md py-sm text-label-sm text-center bg-red-50 dark:bg-red-900/30 text-error border-b border-red-200 dark:border-red-800" role="alert">
          We're having trouble connecting to the server. Some features may be unavailable.
        </div>
      )}

      <div key={location.pathname} className="page-enter flex-1 flex flex-col">
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Candidate (guest) routes */}
          <Route path="/candidate" element={<GuestRoute><CandidatePage /></GuestRoute>} />

          {/* Recruiter (protected) routes — all share RecruiterLayout sidebar */}
          <Route element={<ProtectedRoute><RecruiterLayout /></ProtectedRoute>}>
            <Route path="/recruiter" element={<RecruiterPage />} />
            <Route path="/recruiter/postings/new" element={<PostingFormPage />} />
            <Route path="/recruiter/postings/:postingId" element={<PostingCandidatesPage />} />
            <Route path="/recruiter/postings/:postingId/report" element={<PostingReportPage />} />
            <Route
              path="/recruiter/postings/:postingId/candidates/:applicationId"
              element={<CandidateProfilePage />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

    </div>
  )
}
