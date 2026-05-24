import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getApplication, toggleInterested, getCrossFit, sendSuggestionEmail } from '../api'
import { useAuth } from '../auth/AuthContext'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal'

export default function CandidateProfilePage() {
  const { postingId, applicationId } = useParams()
  const navigate = useNavigate()
  const { email: recruiterEmail, providerToken, reauthorize } = useAuth()

  const [app, setApp]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const [crossFit, setCrossFit]     = useState(null)
  const [crossFitLoading, setCrossFitLoading] = useState(false)

  const [showMeetModal, setShowMeetModal]   = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [selectedPosting, setSelectedPosting] = useState(null)
  const [sendingEmail, setSendingEmail]     = useState(false)
  const [emailSent, setEmailSent]           = useState(false)
  const [emailError, setEmailError]         = useState('')

  useEffect(() => {
    getApplication(applicationId)
      .then(a => { if (!a) setError('Application not found.'); else setApp(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [applicationId])

  useEffect(() => {
    if (!app) return
    setCrossFitLoading(true)
    getCrossFit(applicationId)
      .then(setCrossFit)
      .catch(() => setCrossFit([]))
      .finally(() => setCrossFitLoading(false))
  }, [app, applicationId])

  async function handleInterested() {
    try {
      const updated = await toggleInterested(applicationId, !app.is_interested)
      setApp(updated)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleSendEmail() {
    if (!selectedPosting) return
    if (!providerToken) {
      setEmailError('Google access token missing. Please sign out and sign in again.')
      return
    }
    setSendingEmail(true)
    setEmailError('')
    try {
      await sendSuggestionEmail(
        applicationId,
        {
          target_posting_id: selectedPosting.id,
          candidate_email: app.email,
          candidate_name: app.name,
          recruiter_name: recruiterEmail,
        },
        providerToken
      )
      setEmailSent(true)
    } catch (err) {
      if (err.message === 'REAUTH') {
        setEmailError('Gmail session expired. Re-authorize to continue.')
      } else {
        setEmailError(err.message)
      }
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#6e665f' }}>Loading…</div>
  if (error)   return <div style={{ padding: '2rem', color: '#c0392b' }}>{error}</div>

  const profile = app.profile || {}
  const links   = profile.links || {}
  const pct     = app.rank_score != null ? Math.round(app.rank_score * 100) : null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>
      <button
        onClick={() => navigate(`/recruiter/postings/${postingId}`)}
        style={backBtnStyle}
      >
        ← Back to applicants
      </button>

      {/* Hero card */}
      <div style={{
        background: '#fff', border: '1px solid #e0dbd5', borderRadius: 14,
        padding: '28px 28px 20px', marginTop: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 4px' }}>{app.name || 'Unknown Candidate'}</h1>
            {app.email && <p style={{ color: '#6e665f', margin: '0 0 12px', fontSize: '0.9rem' }}>{app.email}</p>}

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.875rem', color: '#555' }}>
              {app.seniority && <MetaChip>{app.seniority}</MetaChip>}
              {app.years_experience != null && <MetaChip>{app.years_experience}y experience</MetaChip>}
              {app.location && <MetaChip>{app.location}</MetaChip>}
            </div>
          </div>

          {/* Score + interested */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {pct != null && (
              <>
                <div style={{
                  fontSize: '2rem', fontWeight: 800,
                  color: pct >= 75 ? '#2e7d32' : pct >= 50 ? '#e65100' : '#c0392b',
                }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9e9892' }}>match score</div>
              </>
            )}
            <button
              onClick={handleInterested}
              style={{
                marginTop: 10, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '1.6rem',
                color: app.is_interested ? '#f59e0b' : '#c4bfba',
              }}
              title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
            >
              ★
            </button>
            <div style={{ fontSize: '0.7rem', color: '#9e9892' }}>
              {app.is_interested ? 'Interested' : 'Not marked'}
            </div>
          </div>
        </div>

        {/* Links */}
        {(links.linkedin || links.github || links.portfolio || app.file_url) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {links.linkedin && (
              <a href={links.linkedin} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
                LinkedIn ↗
              </a>
            )}
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
                GitHub ↗
              </a>
            )}
            {links.portfolio && (
              <a href={links.portfolio} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
                Portfolio ↗
              </a>
            )}
            {app.file_url && (
              <a href={app.file_url} target="_blank" rel="noopener noreferrer" style={{ ...linkBtnStyle, background: '#000080', color: '#fff', border: 'none' }}>
                Download CV ↓
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMeetModal(true)}
            disabled={!app.email}
            style={{
              padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem',
              border: 'none', borderRadius: 8,
              background: app.email ? '#000080' : '#aaa',
              color: '#fff', cursor: app.email ? 'pointer' : 'not-allowed',
            }}
          >
            Schedule Interview
          </button>
          {crossFit?.length > 0 && (
            <button
              onClick={() => setShowEmailDialog(true)}
              style={{
                padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem',
                border: '1px solid #000080', borderRadius: 8,
                background: '#fff', color: '#000080', cursor: 'pointer',
              }}
            >
              Suggest Other Role
            </button>
          )}
        </div>
      </div>

      {/* AI explanation */}
      {app.explanation && (
        <Section title="Why This Candidate Fits">
          <p style={{ lineHeight: 1.7, color: '#2a2a2a', margin: 0 }}>{app.explanation}</p>
        </Section>
      )}

      {/* Summary */}
      {profile.summary && (
        <Section title="Professional Summary">
          <p style={{ lineHeight: 1.7, color: '#2a2a2a', margin: 0 }}>{profile.summary}</p>
        </Section>
      )}

      {/* Skills */}
      {app.skills?.length > 0 && (
        <Section title="Skills">
          <TagCloud tags={app.skills} color="#e3f2fd" text="#1565c0" />
        </Section>
      )}

      {/* Certifications */}
      {app.certifications?.length > 0 && (
        <Section title="Certifications">
          <TagCloud tags={app.certifications} color="#fce4ec" text="#880e4f" />
        </Section>
      )}

      {/* Languages */}
      {app.languages?.length > 0 && (
        <Section title="Languages">
          <TagCloud tags={app.languages} color="#f3e5f5" text="#6a1b9a" />
        </Section>
      )}

      {/* Matched keywords */}
      {app.overlap_keywords?.length > 0 && (
        <Section title="Matched Keywords">
          <TagCloud tags={app.overlap_keywords} color="#e8f5e9" text="#2e7d32" />
        </Section>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <Section title="Education">
          {profile.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
              {edu.institution && <span style={{ color: '#6e665f' }}> — {edu.institution}</span>}
              {edu.year && <span style={{ color: '#9e9892', fontSize: '0.85rem' }}> ({edu.year})</span>}
            </div>
          ))}
        </Section>
      )}

      {/* Cross-fit suggestions */}
      {!crossFitLoading && crossFit?.length > 0 && (
        <Section title="Better-Fit Roles at the Same Company">
          <p style={{ fontSize: '0.875rem', color: '#6e665f', marginBottom: 12 }}>
            This candidate ranks in the top {crossFit[0]?.position_in_posting} for the following other openings from the same recruiter:
          </p>
          {crossFit.map(fit => (
            <div key={fit.id} style={{
              border: '1px solid #e0dbd5', borderRadius: 8, padding: '12px 16px',
              marginBottom: 8, background: '#fefefe',
            }}>
              <div style={{ fontWeight: 700 }}>{fit.position_title} <span style={{ color: '#6e665f', fontWeight: 400 }}>at {fit.company_name}</span></div>
              <div style={{ fontSize: '0.8rem', color: '#6e665f', marginTop: 4 }}>
                Rank #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Schedule modal */}
      {showMeetModal && (
        <ScheduleMeetingModal
          candidate={{ id: app.candidate_id, name: app.name, email: app.email }}
          recruiterEmail={recruiterEmail}
          onClose={() => setShowMeetModal(false)}
        />
      )}

      {/* Email dialog */}
      {showEmailDialog && !emailSent && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowEmailDialog(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
            maxWidth: 520, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Suggest a Better-Fit Role</h3>
            <p style={{ color: '#6e665f', fontSize: '0.875rem', marginBottom: 16 }}>
              Select a role to suggest to <strong>{app.name || app.email}</strong>. An email will be sent via your Gmail.
            </p>

            {crossFit.map(fit => (
              <label
                key={fit.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', border: `1px solid ${selectedPosting?.id === fit.id ? '#000080' : '#e0dbd5'}`,
                  borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                  background: selectedPosting?.id === fit.id ? '#f0f0ff' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="target_posting"
                  value={fit.id}
                  checked={selectedPosting?.id === fit.id}
                  onChange={() => setSelectedPosting(fit)}
                  style={{ accentColor: '#000080' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{fit.position_title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6e665f' }}>
                    {fit.company_name} · #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
                  </div>
                </div>
              </label>
            ))}

            {emailError && <p style={{ color: '#c0392b', fontSize: '0.875rem', marginTop: 8 }}>{emailError}</p>}
            {emailError?.includes('expired') && (
              <button onClick={reauthorize} style={{ color: '#000080', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>
                Re-authorize Gmail
              </button>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowEmailDialog(false)} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleSendEmail}
                disabled={!selectedPosting || sendingEmail}
                style={{
                  padding: '8px 20px', fontWeight: 700, fontSize: '0.9rem',
                  border: 'none', borderRadius: 8,
                  background: !selectedPosting || sendingEmail ? '#aaa' : '#000080',
                  color: '#fff', cursor: !selectedPosting || sendingEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingEmail ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailSent && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: '36px 28px',
            maxWidth: 420, width: '90%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✉️</div>
            <h3 style={{ margin: '0 0 8px' }}>Email sent!</h3>
            <p style={{ color: '#6e665f', fontSize: '0.875rem', marginBottom: 20 }}>
              Suggestion for <strong>{selectedPosting?.position_title}</strong> was sent to <strong>{app.email}</strong>.
            </p>
            <button onClick={() => { setEmailSent(false); setShowEmailDialog(false) }} style={cancelBtnStyle}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0dbd5', borderRadius: 12,
      padding: '18px 22px', marginBottom: 16,
    }}>
      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6e665f', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function TagCloud({ tags, color, text }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.map(tag => (
        <span key={tag} style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', background: color, color: text }}>
          {tag}
        </span>
      ))}
    </div>
  )
}

function MetaChip({ children }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem',
      background: '#f5f5f5', color: '#555',
    }}>
      {children}
    </span>
  )
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#000080', fontSize: '0.9rem', padding: 0, textDecoration: 'underline',
}

const linkBtnStyle = {
  padding: '6px 14px', fontSize: '0.8rem', fontWeight: 500,
  border: '1px solid #c4bfba', borderRadius: 6,
  background: '#fff', color: '#1a1a1a',
  textDecoration: 'none', display: 'inline-block',
}

const cancelBtnStyle = {
  padding: '8px 18px', fontSize: '0.9rem', fontFamily: 'inherit',
  border: '1px solid #c4bfba', borderRadius: 8,
  background: 'transparent', color: '#6e665f', cursor: 'pointer',
}
