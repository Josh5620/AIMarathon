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
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function GuestRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/recruiter" replace />
  return children
}

export default function App() {
  const [backendUp, setBackendUp] = useState(null)
  const { session, signOut } = useAuth()

  useEffect(() => {
    checkHealth().then(setBackendUp)
  }, [])

  return (
    <div className="app">
      {backendUp === false && (
        <div className="banner banner-error" role="alert">
          We're having trouble connecting to the server. Some features may be unavailable.
        </div>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Candidate (guest) routes */}
          <Route path="/candidate" element={<GuestRoute><CandidatePage /></GuestRoute>} />

          {/* Recruiter (protected) routes */}
          <Route
            path="/recruiter"
            element={<ProtectedRoute><RecruiterPage /></ProtectedRoute>}
          />
          <Route
            path="/recruiter/postings/new"
            element={<ProtectedRoute><PostingFormPage /></ProtectedRoute>}
          />
          <Route
            path="/recruiter/postings/:postingId"
            element={<ProtectedRoute><PostingCandidatesPage /></ProtectedRoute>}
          />
          <Route
            path="/recruiter/postings/:postingId/report"
            element={<ProtectedRoute><PostingReportPage /></ProtectedRoute>}
          />
          <Route
            path="/recruiter/postings/:postingId/candidates/:applicationId"
            element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {session && (
        <button type="button" className="floating-logout" onClick={signOut} title="Sign out">
          Sign out
        </button>
      )}
    </div>
  )
}
