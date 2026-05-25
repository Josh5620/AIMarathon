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
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget && status !== 'loading') onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="bg-surface-container-lowest rounded-none p-card-padding max-w-lg w-full shadow-modal relative">
        <button
          className="absolute top-md right-md text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={onClose}
          disabled={status === 'loading'}
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {status !== 'done' ? (
          <>
            <h2
              id="schedule-modal-title"
              className="font-brand text-[1.25rem] font-bold text-on-surface mb-xs"
            >
              Schedule Interview
            </h2>
            <p className="text-[0.85rem] text-on-surface-variant mb-lg">
              Meeting with <strong className="text-on-surface">{candidateLabel}</strong>
              {!candidate.email && (
                <span className="text-error text-[0.78rem]">
                  {' '}— no email on file, invite cannot be sent
                </span>
              )}
            </p>

            {error && (
              <div className="bg-error-container border border-error/20 rounded-none p-md mb-md">
                <p className="text-[0.85rem] text-error">{error}</p>
                {status === 'reauth' && (
                  <button
                    type="button"
                    onClick={reauthorize}
                    className="mt-sm px-[14px] py-[6px] text-[0.78rem] font-medium border border-error rounded-none text-error hover:bg-error/10 transition-colors"
                  >
                    Re-authorize Google Calendar
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label htmlFor="sm-datetime" className="text-[0.82rem] font-semibold text-on-surface">
                  Date & Time
                </label>
                <input
                  id="sm-datetime"
                  type="datetime-local"
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor="sm-duration" className="text-[0.82rem] font-semibold text-on-surface">
                  Duration
                </label>
                <select
                  id="sm-duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="form-input cursor-pointer"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor="sm-notes" className="text-[0.82rem] font-semibold text-on-surface">
                  Notes (optional)
                </label>
                <textarea
                  id="sm-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics to cover, preparation notes…"
                  rows={3}
                  className="form-input resize-vertical"
                />
              </div>

              <p className="text-meta text-on-surface-variant">
                A Google Meet invite will be emailed to {candidate.email || 'the candidate'} and
                you. The candidate does not need a Google account to join.
              </p>

              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="submit"
                  disabled={status === 'loading' || !candidate.email}
                  aria-busy={status === 'loading'}
                  className="flex items-center gap-[6px] bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-semibold text-[0.78rem] px-[14px] py-[6px] rounded-none transition-all active:scale-95"
                >
                  {status === 'loading' ? (
                    <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Scheduling…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">calendar_add_on</span> Schedule Meeting</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'loading'}
                  className="px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-md">
            <span className="material-symbols-outlined text-[48px] text-picture-book-green mb-md block">
              event_available
            </span>
            <h2 className="font-brand text-[1.25rem] font-bold text-on-surface mb-xs">Meeting scheduled</h2>
            <p className="text-[0.85rem] text-on-surface-variant mb-lg">
              An invite has been emailed to both you and {candidate.name || candidate.email || 'the candidate'}.
            </p>
            {result?.meet_link && (
              <a
                href={result.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-sm bg-primary hover:bg-accent-hover text-on-primary font-semibold text-[0.9rem] px-lg py-sm rounded-none transition-all active:scale-95 mb-md"
              >
                <span className="material-symbols-outlined text-[16px]">video_call</span>
                Open Google Meet link
              </a>
            )}
            <div>
              <button
                type="button"
                onClick={onClose}
                className="px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
