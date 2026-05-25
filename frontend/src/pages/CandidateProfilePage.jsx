import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getApplication, toggleInterested, getCrossFit, sendSuggestionEmail } from '../api'
import { useAuth } from '../auth/AuthContext'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal'

export default function CandidateProfilePage() {
  const { postingId, applicationId } = useParams()
  const navigate = useNavigate()
  const { email: recruiterEmail, providerToken, reauthorize } = useAuth()

  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [crossFit, setCrossFit] = useState(null)
  const [crossFitLoading, setCrossFitLoading] = useState(false)

  const [showMeetModal, setShowMeetModal] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [selectedPosting, setSelectedPosting] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    getApplication(applicationId)
      .then(a => { if (!a) setError('Application not found.'); else setApp(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [applicationId])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!app) return
    setCrossFitLoading(true)
    getCrossFit(applicationId)
      .then(setCrossFit)
      .catch(() => setCrossFit([]))
      .finally(() => setCrossFitLoading(false))
  }, [app, applicationId])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  if (loading) return (
    <div className="flex items-center gap-sm px-[48px] py-[40px] text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Loading…
    </div>
  )
  if (error) return <div className="px-[48px] py-[40px] text-error">{error}</div>

  const profile = app.profile || {}
  const links = profile.links || {}
  const pct = app.rank_score != null ? Math.round(app.rank_score * 100) : null
  const scoreColor = pct == null ? 'text-on-surface-variant' : pct >= 75 ? 'text-picture-book-green' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-error'

  return (
    <>
    <div className="min-h-screen bg-surface">
      {/* Sticky header bar with breadcrumb */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-page-margin h-16 flex items-center justify-between gap-md">
        <nav className="flex items-center gap-xs text-meta text-on-surface-variant">
          <button onClick={() => navigate('/recruiter')} className="hover:text-primary transition-colors">Dashboard</button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <button onClick={() => navigate(`/recruiter/postings/${postingId}`)} className="hover:text-primary transition-colors truncate max-w-xs">
            Applicants
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold">{app.name || 'Candidate'}</span>
        </nav>
      </header>

      <div className="max-w-[960px] px-[48px] py-[40px]">
      <div className="flex gap-[48px] flex-col xl:flex-row items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0">

          {/* Header — flat, no card */}
          <header className="mb-[40px]">
            <div className="flex justify-between items-start gap-lg">
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-[2.2rem] leading-[1.2] font-normal tracking-[-0.02em] text-on-surface mb-[4px]">{app.name || 'Unknown Candidate'}</h1>
                {app.email && <p className="text-[0.85rem] text-on-surface-variant mb-md">{app.email}</p>}
                <div className="flex flex-wrap gap-sm mb-md">
                  {app.seniority && (
                    <span className="inline-flex px-[12px] py-[3px] text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{app.seniority}</span>
                  )}
                  {app.years_experience != null && (
                    <span className="inline-flex px-[12px] py-[3px] text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-surface-container text-on-surface-variant">
                      {app.years_experience}y experience
                    </span>
                  )}
                  {app.location && (
                    <span className="inline-flex items-center gap-xs px-[12px] py-[3px] text-[0.7rem] font-semibold tracking-[0.06em] bg-surface-container text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {app.location}
                    </span>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-sm">
                  {links.linkedin?.trim().startsWith('http') ? (
                    <a href={links.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[16px]">link</span> LinkedIn
                    </a>
                  ) : (
                    <span className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant opacity-40 cursor-not-allowed">
                      <span className="material-symbols-outlined text-[16px]">link</span> LinkedIn
                    </span>
                  )}
                  {links.github?.trim().startsWith('http') ? (
                    <a href={links.github} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[16px]">code</span> GitHub
                    </a>
                  ) : (
                    <span className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant opacity-40 cursor-not-allowed">
                      <span className="material-symbols-outlined text-[16px]">code</span> GitHub
                    </span>
                  )}
                  {links.portfolio?.trim().startsWith('http') ? (
                    <a href={links.portfolio} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span> Portfolio
                    </a>
                  ) : (
                    <span className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant opacity-40 cursor-not-allowed">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span> Portfolio
                    </span>
                  )}
                  {app.file_url && (
                    <a href={app.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[6px] px-[14px] py-[6px] bg-primary hover:bg-accent-hover text-on-primary font-semibold text-[0.78rem] rounded-none transition-colors">
                      <span className="material-symbols-outlined text-[16px]">download</span> Download CV
                    </a>
                  )}
                </div>
              </div>

              {/* Score + star */}
              <div className="flex flex-col items-center gap-md flex-shrink-0">
                {pct != null && (
                  <div className="text-right">
                    <div className={`font-heading text-[2.4rem] font-extrabold leading-none ${scoreColor}`}>{pct}%</div>
                    <div className="text-[0.7rem] text-on-surface-variant mt-xs">match</div>
                  </div>
                )}
                <button
                  onClick={handleInterested}
                  className={`flex items-center gap-xs transition-all active:scale-95 ${
                    app.is_interested ? 'text-yellow-500 hover:text-yellow-600' : 'text-outline-variant hover:text-yellow-500'
                  }`}
                  title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                >
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: app.is_interested ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                  <span className="text-[0.78rem] font-medium">{app.is_interested ? 'Interested' : 'Mark'}</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-sm flex-wrap mt-lg pt-lg border-t border-outline-variant">
              <button
                onClick={() => setShowMeetModal(true)}
                disabled={!app.email}
                className="flex items-center gap-[6px] bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-semibold text-[0.78rem] px-[14px] py-[6px] rounded-none transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_add_on</span>
                Schedule Interview
              </button>

              {crossFit?.length > 0 && (
                <button
                  onClick={() => setShowEmailDialog(true)}
                  className="flex items-center gap-[6px] border border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface font-medium text-[0.78rem] px-[14px] py-[6px] rounded-none transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                  Suggest Other Role
                </button>
              )}

              <button
                onClick={() => navigate(`/recruiter/postings/${postingId}/report`)}
                className="flex items-center gap-[6px] border border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface font-medium text-[0.78rem] px-[14px] py-[6px] rounded-none transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                View Report
              </button>
            </div>
          </header>

          {/* AI Professional Summary */}
          {profile.summary && (
            <Section title="AI Professional Summary" icon="psychology">
              <p className="text-[0.875rem] text-on-surface leading-relaxed">{profile.summary}</p>
            </Section>
          )}

          {/* AI Explanation / Insights */}
          {app.explanation && (
            <section className="mb-[40px]">
              <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
                <h2 className="font-heading text-[1.3rem] font-bold text-on-surface flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  AI Insights
                </h2>
              </div>
              <div className="border-l-[3px] border-primary pl-lg">
                <p className="text-[0.875rem] text-on-surface leading-relaxed">{app.explanation}</p>
              </div>
            </section>
          )}

          {/* Skills */}
          {app.skills?.length > 0 && (
            <Section title="Skill Expertise" icon="psychology_alt">
              <TagCloud tags={app.skills} colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            </Section>
          )}

          {/* Certifications */}
          {app.certifications?.length > 0 && (
            <Section title="Certifications" icon="verified">
              <TagCloud tags={app.certifications} colorClass="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400" />
            </Section>
          )}

          {/* Languages */}
          {app.languages?.length > 0 && (
            <Section title="Languages" icon="translate">
              <TagCloud tags={app.languages} colorClass="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
            </Section>
          )}

          {/* Matched keywords */}
          {app.overlap_keywords?.length > 0 && (
            <Section title="Matched Keywords" icon="key">
              <TagCloud tags={app.overlap_keywords} colorClass="bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400" />
            </Section>
          )}

          {/* Education */}
          {profile.education?.length > 0 && (
            <Section title="Education" icon="school">
              <div className="flex flex-col gap-md">
                {profile.education.map((edu, i) => (
                  <div key={i}>
                    <div className="font-heading text-[1rem] font-bold text-on-surface">
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                    </div>
                    {edu.institution && <div className="text-[0.85rem] text-on-surface-variant">{edu.institution}</div>}
                    {edu.year && <div className="text-[0.78rem] text-on-surface-variant">{edu.year}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Cross-fit */}
          {!crossFitLoading && crossFit?.length > 0 && (
            <Section title="Better-Fit Roles" icon="compare_arrows">
              <p className="text-[0.85rem] text-on-surface-variant mb-md">
                This candidate also ranks highly for other open roles:
              </p>
              <div className="flex flex-col">
                {crossFit.map(fit => (
                  <div key={fit.id} className="py-sm border-b border-outline-variant last:border-b-0">
                    <div className="text-[0.85rem] font-bold text-on-surface">
                      {fit.position_title} <span className="font-normal text-on-surface-variant">at {fit.company_name}</span>
                    </div>
                    <div className="text-[0.78rem] text-on-surface-variant mt-xs">
                      Rank #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right sidebar — Candidate Vitals */}
        <aside className="xl:w-56 flex-shrink-0">
          <div className="border border-outline-variant rounded-none p-lg sticky top-24">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-on-surface-variant mb-lg">Candidate Vitals</h3>
            <div className="flex flex-col gap-md">
              {app.seniority && <Vital icon="grade" label="Seniority" value={app.seniority} />}
              {app.years_experience != null && <Vital icon="history" label="Experience" value={`${app.years_experience} years`} />}
              {app.location && <Vital icon="location_on" label="Location" value={app.location} />}
              {profile.work_authorization && <Vital icon="badge" label="Work Auth" value={profile.work_authorization} />}
              {pct != null && <Vital icon="percent" label="Match Score" value={`${pct}%`} valueClass={scoreColor} />}
            </div>
          </div>
        </aside>
      </div>

      </div>
    </div>

      {/* Modals — rendered outside the main content div to avoid backdrop-filter containing block issues */}
      {showMeetModal && (
        <ScheduleMeetingModal
          candidate={{ id: app.candidate_id, name: app.name, email: app.email }}
          recruiterEmail={recruiterEmail}
          onClose={() => setShowMeetModal(false)}
        />
      )}

      {showEmailDialog && !emailSent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-md"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEmailDialog(false) }}
        >
          <div className="bg-surface-container-lowest rounded-none p-card-padding max-w-lg w-full shadow-modal">
            <h3 className="font-heading text-[1.25rem] font-bold text-on-surface mb-xs">Suggest a Better-Fit Role</h3>
            <p className="text-[0.85rem] text-on-surface-variant mb-gutter">
              Select a role to suggest to <strong>{app.name || app.email}</strong>. An email will be sent via your Gmail.
            </p>
            <div className="flex flex-col gap-sm mb-gutter">
              {crossFit.map(fit => (
                <label
                  key={fit.id}
                  className={`flex items-center gap-md p-md border rounded-none cursor-pointer transition-colors ${
                    selectedPosting?.id === fit.id
                      ? 'border-primary bg-blue-50 dark:bg-blue-900/30'
                      : 'border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="target_posting"
                    value={fit.id}
                    checked={selectedPosting?.id === fit.id}
                    onChange={() => setSelectedPosting(fit)}
                    className="accent-primary"
                  />
                  <div>
                    <div className="text-[0.85rem] font-bold text-on-surface">{fit.position_title}</div>
                    <div className="text-[0.78rem] text-on-surface-variant">
                      {fit.company_name} · #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {emailError && <p className="text-error text-[0.78rem] mb-md">{emailError}</p>}
            {emailError?.includes('expired') && (
              <button onClick={reauthorize} className="text-primary underline text-[0.78rem] mb-md">
                Re-authorize Gmail
              </button>
            )}
            <div className="flex justify-end gap-sm">
              <button onClick={() => setShowEmailDialog(false)}
                className="px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!selectedPosting || sendingEmail}
                className="flex items-center gap-[6px] bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-semibold text-[0.78rem] px-[14px] py-[6px] rounded-none transition-all active:scale-95"
              >
                {sendingEmail ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Sending…</>
                ) : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-surface-container-lowest rounded-none p-card-padding max-w-sm w-full shadow-modal text-center">
            <span className="material-symbols-outlined text-[48px] text-picture-book-green mb-md block">mark_email_read</span>
            <h3 className="font-heading text-[1.25rem] font-bold text-on-surface mb-xs">Email sent!</h3>
            <p className="text-[0.85rem] text-on-surface-variant mb-gutter">
              Suggestion for <strong>{selectedPosting?.position_title}</strong> was sent to <strong>{app.email}</strong>.
            </p>
            <button onClick={() => { setEmailSent(false); setShowEmailDialog(false) }}
              className="px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, icon, children }) {
  return (
    <section className="mb-[40px]">
      <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
        <h2 className="font-heading text-[1.3rem] font-bold text-on-surface flex items-center gap-sm">
          {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function TagCloud({ tags, colorClass }) {
  return (
    <div className="flex flex-wrap gap-sm">
      {tags.map(tag => (
        <span key={tag} className={`px-[12px] py-[3px] text-[0.7rem] font-semibold tracking-[0.06em] ${colorClass}`}>
          {tag}
        </span>
      ))}
    </div>
  )
}

function Vital({ icon, label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="flex items-center gap-sm">
      <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[0.7rem] text-on-surface-variant">{label}</div>
        <div className={`text-[0.85rem] font-semibold truncate ${valueClass}`}>{value}</div>
      </div>
    </div>
  )
}
