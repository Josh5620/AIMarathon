import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { checkHealth } from './api'
import { useAuth } from './auth/AuthContext'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import PostingFormPage from './pages/PostingFormPage'
import PostingCandidatesPage from './pages/PostingCandidatesPage'
import PostingReportPage from './pages/PostingReportPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import Landing from './components/Landing'
import RecruiterLayout from './components/RecruiterLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ThemeToggle from './components/ThemeToggle'

function GuestRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/recruiter" replace />
  return children
}

export default function App() {
  const [backendUp, setBackendUp] = useState(null)

  useEffect(() => {
    checkHealth().then(setBackendUp)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {backendUp === false && (
        <div className="px-md py-sm text-label-sm text-center bg-red-50 text-error border-b border-red-200" role="alert">
          We're having trouble connecting to the server. Some features may be unavailable.
        </div>
      )}

      <Routes>
        <Route path="/" element={<Landing />} />

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

      <ThemeToggle />
    </div>
  )
}
