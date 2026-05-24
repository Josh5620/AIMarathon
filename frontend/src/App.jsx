import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { checkHealth } from './api'
import { useAuth } from './auth/AuthContext'
import CandidatePage from './pages/CandidatePage'
import PostingDetailGuestPage from './pages/PostingDetailGuestPage'
import RecruiterPage from './pages/RecruiterPage'
import PostingFormPage from './pages/PostingFormPage'
import PostingCandidatesPage from './pages/PostingCandidatesPage'
import PostingReportPage from './pages/PostingReportPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import Landing from './components/Landing'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

export default function App() {
  const [backendUp, setBackendUp] = useState(null)
  const { email, signOut } = useAuth()

  useEffect(() => {
    checkHealth().then(setBackendUp)
  }, [])

  return (
    <div className="app">
      <nav className="app-nav" aria-label="Main navigation">
        <NavLink to="/candidate">Job Openings</NavLink>
        <NavLink to="/recruiter">Recruiter Dashboard</NavLink>
        {email && (
          <div className="app-auth">
            <span className="app-auth-email" title={email}>{email}</span>
            <button type="button" className="app-auth-btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </nav>

      {backendUp === false && (
        <div className="banner banner-error" role="alert">
          We're having trouble connecting to the server. Some features may be unavailable.
        </div>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Candidate (guest) routes */}
          <Route path="/candidate" element={<CandidatePage />} />
          <Route path="/candidate/postings/:postingId" element={<PostingDetailGuestPage />} />

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
    </div>
  )
}
