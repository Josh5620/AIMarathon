import { useState, useEffect } from 'react'
import { scheduleMeeting } from '../api'
import { useAuth } from '../auth/AuthContext'

function defaultDatetime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const DURATION_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
]

export default function ScheduleMeetingModal({ candidate, recruiterEmail, onClose, onScheduled }) {
  const { providerToken, reauthorize } = useAuth()
  const [datetime, setDatetime] = useState(defaultDatetime)
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && status !== 'loading') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, status])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!providerToken) {
      setError('Google Calendar access is required. Please sign out and sign in again.')
      return
    }

    setStatus('loading')
    setError('')

    const localDt = new Date(datetime)
    const startIso = localDt.toISOString()

    try {
      const meeting = await scheduleMeeting(providerToken, {
        candidate_id: candidate.id,
        recruiter_email: recruiterEmail,
        start_iso: startIso,
        duration_minutes: duration,
        notes: notes.trim() || undefined,
      })
      setResult(meeting)
      setStatus('done')
      onScheduled?.()
    } catch (err) {
      if (err.message === 'REAUTH') {
        setError(
          'Your Google Calendar session expired. Click below to re-authorize, then try again.'
        )
        setStatus('reauth')
      } else {
        setError(err.message)
        setStatus('error')
      }
    }
  }

  const candidateLabel = candidate.name
    ? `${candidate.name}${candidate.email ? ` (${candidate.email})` : ''}`
    : (candidate.email || 'this candidate')

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && status !== 'loading') onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          disabled={status === 'loading'}
          aria-label="Close"
        >
          ×
        </button>

        {status !== 'done' ? (
          <>
            <h2 id="schedule-modal-title" style={{ marginBottom: 4 }}>Schedule Interview</h2>
            <p className="schedule-modal-subtitle">
              Meeting with <strong>{candidateLabel}</strong>
              {!candidate.email && (
                <span className="schedule-no-email">
                  {' '}— no email on file, invite cannot be sent
                </span>
              )}
            </p>

            {error && (
              <div className="modal-error" style={{ marginBottom: 16 }}>
                <p style={{ margin: 0 }}>{error}</p>
                {status === 'reauth' && (
                  <button
                    type="button"
                    onClick={reauthorize}
                    style={{
                      marginTop: 8, padding: '6px 14px', fontSize: '0.85rem',
                      fontFamily: 'inherit', border: '1px solid #bf360c', borderRadius: 6,
                      background: 'transparent', color: '#bf360c', cursor: 'pointer',
                    }}
                  >
                    Re-authorize Google Calendar
                  </button>
                )}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sm-datetime"
                  style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6e665f' }}
                >
                  Date & Time
                </label>
                <input
                  id="sm-datetime"
                  type="datetime-local"
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  required
                  style={{
                    padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid #c4bfba', borderRadius: 6,
                    background: '#faf9f8', color: '#3B3430',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sm-duration"
                  style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6e665f' }}
                >
                  Duration
                </label>
                <select
                  id="sm-duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={{
                    padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid #c4bfba', borderRadius: 6,
                    background: '#faf9f8', color: '#3B3430', cursor: 'pointer',
                  }}
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sm-notes"
                  style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6e665f' }}
                >
                  Notes (optional)
                </label>
                <textarea
                  id="sm-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics to cover, preparation notes…"
                  rows={3}
                  style={{
                    padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid #c4bfba', borderRadius: 6, background: '#faf9f8',
                    color: '#3B3430', resize: 'vertical',
                  }}
                />
              </div>

              <p style={{ fontSize: '0.8rem', color: '#9e9892', margin: 0 }}>
                A Google Meet invite will be emailed to {candidate.email || 'the candidate'} and
                you. The candidate does not need a Google account to join.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'loading'}
                  style={{
                    padding: '8px 20px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid #c4bfba', borderRadius: 6, background: 'transparent',
                    color: '#6e665f', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading' || !candidate.email}
                  aria-busy={status === 'loading'}
                  style={{
                    padding: '8px 20px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
                    border: 'none', borderRadius: 6, background: '#000080', color: '#fff',
                    cursor: (status === 'loading' || !candidate.email) ? 'not-allowed' : 'pointer',
                    opacity: (status === 'loading' || !candidate.email) ? 0.6 : 1,
                  }}
                >
                  {status === 'loading' ? 'Scheduling…' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✓</div>
            <h2 style={{ marginBottom: 8 }}>Meeting scheduled</h2>
            <p style={{ color: '#6e665f', fontSize: '0.9rem', marginBottom: 20 }}>
              An invite has been emailed to both you and {candidate.name || candidate.email || 'the candidate'}.
            </p>
            {result?.meet_link && (
              <a
                href={result.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link-btn"
                style={{ display: 'inline-block', marginBottom: 16 }}
              >
                Open Google Meet link
              </a>
            )}
            <br />
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 24px', fontSize: '0.9rem', fontFamily: 'inherit',
                border: '1px solid #c4bfba', borderRadius: 6, background: 'transparent',
                color: '#6e665f', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
