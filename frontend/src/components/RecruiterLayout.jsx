import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRecruiter, getMeetings, cancelMeeting } from '../api'
import RecruiterProfileModal from './RecruiterProfileModal'
import ThemeToggle from './ThemeToggle'

function initials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return (email || '?')[0].toUpperCase()
}

function formatMeetingTime(isoStr) {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

export default function RecruiterLayout() {
  const { email, providerToken, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [meetingsOpen, setMeetingsOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  const reload = useCallback(async () => {
    if (!email) return
    const [p, m] = await Promise.all([
      getRecruiter(email).catch(() => null),
      getMeetings(email).catch(() => []),
    ])
    setProfile(p)
    setMeetings(m || [])
  }, [email])

  useEffect(() => { reload() }, [reload]) // eslint-disable-line react-hooks/set-state-in-effect

  async function handleCancel(meetingId, candidateName) {
    if (!confirm(`Cancel the meeting with ${candidateName || 'this candidate'}?`)) return
    if (!providerToken) { alert('Google session expired — please sign out and sign in again.'); return }
    setCancellingId(meetingId)
    try {
      await cancelMeeting(meetingId, providerToken)
      await reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const displayName = profile?.name || email || 'Recruiter'
  const org = profile?.organization || ''
  const jobTitle = profile?.job_title || ''
  const upcoming = meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at) >= new Date())

  return (
    <div className="flex min-h-screen bg-surface font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container border-r border-outline-variant flex flex-col z-50 shadow-sidebar">

        {/* Logo + Theme toggle */}
        <div className="flex items-center justify-between px-md py-lg">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/recruiter')}
          >
            <img src="/logo.png" alt="HireLite logo" className="w-8 h-8 object-contain rounded" />
            <span className="text-section-head font-bold text-primary tracking-tight">HireLite</span>
          </div>
          <ThemeToggle inline />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-sm space-y-xs">
          <NavLink
            to="/recruiter"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-md py-sm rounded-lg text-label-sm transition-colors duration-200 ${
                isActive
                  ? 'bg-secondary-container text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/recruiter"
            className={({ isActive }) =>
              `flex items-center gap-3 px-md py-sm rounded-lg text-label-sm transition-colors duration-200 ${
                isActive && window.location.pathname !== '/recruiter'
                  ? 'bg-secondary-container text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">work</span>
            My Postings
          </NavLink>

          {/* Meetings nav item with inline collapsible panel */}
          <div>
            <button
              onClick={() => setMeetingsOpen(o => !o)}
              className="w-full flex items-center justify-between px-md py-sm rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                Meetings
              </span>
              <span className="flex items-center gap-1">
                {upcoming.length > 0 && (
                  <span className="bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {upcoming.length}
                  </span>
                )}
                <span className="material-symbols-outlined text-[16px]">{meetingsOpen ? 'expand_less' : 'expand_more'}</span>
              </span>
            </button>

            {meetingsOpen && (
              <div className="mt-xs mx-sm bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                {meetings.length === 0 ? (
                  <p className="text-meta text-on-surface-variant text-center py-sm px-md">No meetings scheduled.</p>
                ) : meetings.map(m => (
                  <div key={m.id} className="p-sm border-b border-outline-variant last:border-b-0">
                    <div className="text-label-sm font-semibold text-on-surface truncate">
                      {m.candidate_name || m.candidate_email}
                    </div>
                    <div className="text-meta text-on-surface-variant">{formatMeetingTime(m.scheduled_at)}</div>
                    <div className="flex gap-sm mt-xs">
                      {m.meet_link && (
                        <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                          className="text-meta text-primary underline">Join</a>
                      )}
                      <button
                        onClick={() => handleCancel(m.id, m.candidate_name || m.candidate_email)}
                        disabled={cancellingId === m.id}
                        className="text-meta text-error disabled:opacity-50"
                      >
                        {cancellingId === m.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ToDo: Settings nav item — route not yet implemented */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-md py-sm rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Profile
          </button>
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-outline-variant px-md py-md">
          <div className="w-full flex items-center gap-sm rounded-lg p-sm">
            <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold flex-shrink-0">
              {initials(profile?.name, email)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-label-sm font-semibold text-on-surface truncate">{displayName}</div>
              {(org || jobTitle) && (
                <div className="text-meta text-on-surface-variant truncate">
                  {[jobTitle, org].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={signOut}
            className="mt-sm w-full flex items-center gap-sm px-md py-sm rounded-full bg-midnight-mirage text-on-primary text-label-sm font-medium hover:bg-nuit-blanche transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen">
        <Outlet />
      </main>

      {/* Profile modal */}
      {profileModalOpen && (
        <RecruiterProfileModal
          email={email}
          profile={profile}
          onClose={() => setProfileModalOpen(false)}
          onSaved={(updated) => {
            setProfile(updated)
            setProfileModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
