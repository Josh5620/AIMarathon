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
    <>
      {/* Sidebar — outside flex wrapper so fixed positioning is never affected by content reflows */}
      <aside
        className="print:hidden fixed left-0 top-0 bottom-0 w-64 bg-surface-container border-r border-outline-variant flex flex-col z-50 shadow-sidebar overflow-hidden"
      >

        {/* Logo + Theme toggle */}
        <div className="flex items-center justify-between px-md h-16 border-b border-outline-variant flex-shrink-0">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/recruiter')}
          >
            <img src="/logo.png" alt="HireLite logo" className="w-8 h-8 object-contain rounded" />
            <span className="font-heading text-[1.6rem] font-extrabold text-primary tracking-[-0.02em]">HireLite</span>
          </div>
          <ThemeToggle inline />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-sm pt-md space-y-xs">
          <NavLink
            to="/recruiter"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-md py-sm rounded-none text-label-sm transition-colors duration-200 ${
                isActive
                  ? 'bg-secondary-container dark:bg-mantis/20 text-primary dark:text-mantis font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </NavLink>


          {/* Meetings nav item with inline collapsible panel */}
          <div>
            <button
              onClick={() => setMeetingsOpen(o => !o)}
              className="w-full flex items-center justify-between px-md py-sm rounded-none text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200"
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
              <div className="mt-xs mx-sm bg-surface-container-lowest border border-outline-variant rounded-none overflow-hidden">
                {meetings.length === 0 ? (
                  <p className="text-meta text-on-surface-variant text-center py-md px-md">No meetings scheduled.</p>
                ) : meetings.map(m => (
                  <div key={m.id} className="px-md py-sm border-b border-outline-variant last:border-b-0">
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="material-symbols-outlined text-[14px] text-mantis">person</span>
                      <span className="text-[0.78rem] font-semibold text-on-surface truncate">
                        {m.candidate_name || m.candidate_email}
                      </span>
                    </div>
                    <div className="flex items-center gap-sm mb-sm">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">schedule</span>
                      <span className="text-[0.72rem] text-on-surface-variant">{formatMeetingTime(m.scheduled_at)}</span>
                    </div>
                    <div className="flex gap-xs">
                      {m.meet_link && (
                        <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-[4px] px-sm py-[2px] bg-picture-book-green dark:bg-mantis text-white dark:text-midnight-mirage text-[0.7rem] font-semibold rounded-none hover:opacity-90 transition-colors">
                          <span className="material-symbols-outlined text-[12px]">video_call</span> Join
                        </a>
                      )}
                      <button
                        onClick={() => handleCancel(m.id, m.candidate_name || m.candidate_email)}
                        disabled={cancellingId === m.id}
                        className="flex items-center gap-[4px] px-sm py-[2px] border border-outline-variant text-[0.7rem] font-medium text-on-surface-variant hover:text-error hover:border-error transition-colors disabled:opacity-50 rounded-none"
                      >
                        {cancellingId === m.id ? 'Cancelling…' : (
                          <><span className="material-symbols-outlined text-[12px]">close</span> Cancel</>
                        )}
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
            className="w-full flex items-center gap-3 px-md py-sm rounded-none text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Profile
          </button>
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-outline-variant px-sm py-sm flex-shrink-0">
          <div className="w-full flex items-center gap-3 px-md py-sm">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-meta font-bold flex-shrink-0">
              {initials(profile?.name, email)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[0.78rem] font-semibold text-on-surface truncate">{displayName}</div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="flex-shrink-0 p-xs text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 print:ml-0 min-h-screen bg-surface font-sans">
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
    </>
  )
}
