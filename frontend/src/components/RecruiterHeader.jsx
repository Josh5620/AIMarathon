import { useState, useEffect, useCallback } from 'react'
import { getRecruiter, getMeetings, cancelMeeting } from '../api'
import RecruiterProfileModal from './RecruiterProfileModal'

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

export default function RecruiterHeader({ email, providerToken }) {
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

  useEffect(() => { reload() }, [reload])

  async function handleCancel(meetingId, candidateName) {
    if (!confirm(`Cancel the meeting with ${candidateName || 'this candidate'}? The event will be removed from Google Calendar and attendees will be notified.`)) return
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

  if (!email) return null

  const displayName = profile?.name || email
  const org = profile?.organization || ''
  const jobTitle = profile?.job_title || ''
  const upcoming = meetings.filter(
    (m) => m.scheduled_at && new Date(m.scheduled_at) >= new Date()
  )

  return (
    <>
      <div className="recruiter-header">
        <div className="recruiter-header-left">
          <div className="recruiter-avatar">{initials(profile?.name, email)}</div>
          <div className="recruiter-info">
            <span className="recruiter-name">{displayName}</span>
            {(org || jobTitle) && (
              <span className="recruiter-role">
                {[jobTitle, org].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="recruiter-header-right">
          {meetings.length > 0 && (
            <button
              type="button"
              className="meetings-pill"
              onClick={() => setMeetingsOpen((o) => !o)}
              aria-expanded={meetingsOpen}
            >
              {meetingsOpen ? '▲' : '▼'} Meetings
              {upcoming.length > 0 && (
                <span className="meetings-badge">{upcoming.length}</span>
              )}
            </button>
          )}
          <button
            type="button"
            className="edit-profile-btn"
            onClick={() => setProfileModalOpen(true)}
          >
            Edit profile
          </button>
        </div>
      </div>

      {meetingsOpen && meetings.length > 0 && (
        <div className="meetings-panel">
          <h4 className="meetings-panel-title">Scheduled Meetings</h4>
          <ul className="meetings-list">
            {meetings.map((m) => (
              <li key={m.id} className="meeting-item">
                <div className="meeting-item-info">
                  <span className="meeting-candidate">
                    {m.candidate_name || m.candidate_email}
                  </span>
                  <span className="meeting-time">{formatMeetingTime(m.scheduled_at)}</span>
                  {m.duration_minutes && (
                    <span className="meeting-duration">{m.duration_minutes} min</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {m.meet_link && (
                    <a
                      href={m.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meeting-join-btn"
                    >
                      Join Meet
                    </a>
                  )}
                  <button
                    onClick={() => handleCancel(m.id, m.candidate_name || m.candidate_email)}
                    disabled={cancellingId === m.id}
                    style={{
                      background: 'none', border: '1px solid #e0dbd5', borderRadius: 4,
                      padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer',
                      color: cancellingId === m.id ? '#aaa' : '#c0392b',
                    }}
                  >
                    {cancellingId === m.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
