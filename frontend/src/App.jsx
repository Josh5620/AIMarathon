import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { checkHealth } from './api'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import './App.css'

export default function App() {
  const [backendUp, setBackendUp] = useState(null)

  useEffect(() => {
    checkHealth().then(setBackendUp)
  }, [])

  return (
    <div className="app">
      <nav className="app-nav" aria-label="Main navigation">
        <NavLink to="/candidate">Candidate Upload</NavLink>
        <NavLink to="/recruiter">Recruiter Search</NavLink>
      </nav>

      {backendUp === false && (
        <div className="banner banner-error" role="alert">
          We're having trouble connecting to the server. Some features may be unavailable.
        </div>
      )}

      <main>
        <Routes>
          <Route path="/candidate" element={<CandidatePage />} />
          <Route path="/recruiter" element={<RecruiterPage />} />
          <Route path="*" element={<Navigate to="/recruiter" replace />} />
        </Routes>
      </main>
    </div>
  )
}
