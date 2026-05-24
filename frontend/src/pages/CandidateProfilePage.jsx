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
    <div className="flex items-center justify-center p-page-margin text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin mr-sm">progress_activity</span> Loading…
    </div>
  )
  if (error) return <div className="p-page-margin text-error">{error}</div>

  const profile = app.profile || {}
  const links = profile.links || {}
  const pct = app.rank_score != null ? Math.round(app.rank_score * 100) : null
  const scoreColor = pct == null ? 'text-on-surface-variant' : pct >= 75 ? 'text-picture-book-green' : pct >= 50 ? 'text-amber-600' : 'text-error'

  return (
    <div className="p-page-margin">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-xs text-meta text-on-surface-variant mb-gutter">
        <button onClick={() => navigate('/recruiter')} className="hover:text-primary transition-colors">Dashboard</button>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <button onClick={() => navigate(`/recruiter/postings/${postingId}`)} className="hover:text-primary transition-colors truncate max-w-xs">
          Applicants
        </button>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface font-semibold">{app.name || 'Candidate'}</span>
      </nav>

      <div className="flex gap-gutter flex-col xl:flex-row">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-gutter">

          {/* Hero card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm overflow-hidden relative">
            <div className="flex justify-between items-start gap-md">
              <div className="flex-1 min-w-0">
                <h1 className="text-page-title font-bold text-on-surface mb-xs">{app.name || 'Unknown Candidate'}</h1>
                {app.email && <p className="text-body-md text-on-surface-variant mb-md">{app.email}</p>}
                <div className="flex flex-wrap gap-sm mb-md">
                  {app.seniority && (
                    <span className="px-sm py-xs rounded-full text-meta font-semibold bg-blue-50 text-blue-700">{app.seniority}</span>
                  )}
                  {app.years_experience != null && (
                    <span className="px-sm py-xs rounded-full text-meta font-semibold bg-surface-container text-on-surface-variant">
                      {app.years_experience}y experience
                    </span>
                  )}
                  {app.location && (
                    <span className="flex items-center gap-xs px-sm py-xs rounded-full text-meta bg-surface-container text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {app.location}
                    </span>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-sm">
                  {links.linkedin && (
                    <a href={links.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[16px]">link</span> LinkedIn
                    </a>
                  )}
                  {links.github && (
                    <a href={links.github} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[16px]">code</span> GitHub
                    </a>
                  )}
                  {links.portfolio && (
                    <a href={links.portfolio} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span> Portfolio
                    </a>
                  )}
                  {app.file_url && (
                    <a href={app.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-xs px-md py-xs bg-primary text-on-primary rounded-lg text-label-sm font-semibold hover:bg-accent-hover transition-colors">
                      <span className="material-symbols-outlined text-[16px]">download</span> Download CV
                    </a>
                  )}
                </div>
              </div>

              {/* Score + star */}
              <div className="flex flex-col items-center gap-sm flex-shrink-0">
                {pct != null && (
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl px-lg py-md text-center hover:bg-secondary-container/10 transition-colors cursor-default">
                    <div className={`text-headline-lg font-bold ${scoreColor}`}>{pct}%</div>
                    <div className="text-meta text-on-surface-variant">match</div>
                  </div>
                )}
                <button
                  onClick={handleInterested}
                  className={`flex flex-col items-center gap-xs p-sm rounded-lg transition-all active:scale-95 ${
                    app.is_interested ? 'text-yellow-500 hover:text-yellow-600' : 'text-outline-variant hover:text-yellow-500'
                  }`}
                  title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                >
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: app.is_interested ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                  <span className="text-meta">{app.is_interested ? 'Interested' : 'Mark'}</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-sm flex-wrap mt-gutter pt-gutter border-t border-outline-variant">
              <button
                onClick={() => setShowMeetModal(true)}
                disabled={!app.email}
                className="flex items-center gap-xs bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-bold text-label-sm px-lg py-sm rounded-xl transition-all active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                Schedule Interview
              </button>

              {crossFit?.length > 0 && (
                <button
                  onClick={() => setShowEmailDialog(true)}
                  className="flex items-center gap-xs border border-primary text-primary hover:bg-surface-container font-semibold text-label-sm px-lg py-sm rounded-xl transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                  Suggest Other Role
                </button>
              )}

              <button
                onClick={() => navigate(`/recruiter/postings/${postingId}/report`)}
                className="flex items-center gap-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container text-label-sm px-lg py-sm rounded-xl transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                View Report
              </button>
            </div>
          </section>

          {/* AI Professional Summary */}
          {profile.summary && (
            <ProfileSection title="AI Professional Summary" icon="psychology">
              <p className="text-body-md text-on-surface leading-relaxed">{profile.summary}</p>
            </ProfileSection>
          )}

          {/* AI Explanation */}
          {app.explanation && (
            <section className="bg-primary text-on-primary rounded-xl p-card-padding shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, #74C365 0%, transparent 60%)' }} />
              <h2 className="text-section-head font-bold uppercase tracking-wider text-on-primary/80 mb-md flex items-center gap-sm">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                AI Insights
              </h2>
              <p className="text-body-md leading-relaxed">{app.explanation}</p>
            </section>
          )}

          {/* Skills */}
          {app.skills?.length > 0 && (
            <ProfileSection title="Skill Expertise" icon="psychology_alt">
              <TagCloud tags={app.skills} colorClass="bg-blue-50 text-blue-700" />
            </ProfileSection>
          )}

          {/* Certifications */}
          {app.certifications?.length > 0 && (
            <ProfileSection title="Certifications" icon="verified">
              <TagCloud tags={app.certifications} colorClass="bg-pink-50 text-pink-700" />
            </ProfileSection>
          )}

          {/* Languages */}
          {app.languages?.length > 0 && (
            <ProfileSection title="Languages" icon="translate">
              <TagCloud tags={app.languages} colorClass="bg-purple-50 text-purple-700" />
            </ProfileSection>
          )}

          {/* Matched keywords */}
          {app.overlap_keywords?.length > 0 && (
            <ProfileSection title="Matched Keywords" icon="key">
              <TagCloud tags={app.overlap_keywords} colorClass="bg-green-50 text-picture-book-green" />
            </ProfileSection>
          )}

          {/* Education */}
          {profile.education?.length > 0 && (
            <ProfileSection title="Education & Certs" icon="school">
              <div className="flex flex-col gap-md">
                {profile.education.map((edu, i) => (
                  <div key={i}>
                    <div className="text-headline-md-mobile font-bold text-on-surface">
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                    </div>
                    {edu.institution && <div className="text-body-md text-on-surface-variant">{edu.institution}</div>}
                    {edu.year && <div className="text-meta text-on-surface-variant">{edu.year}</div>}
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* Cross-fit — note: not in Stitch design, kept as extra section */}
          {!crossFitLoading && crossFit?.length > 0 && (
            <ProfileSection title="Better-Fit Roles" icon="compare_arrows">
              <p className="text-body-md text-on-surface-variant mb-md">
                This candidate also ranks highly for other open roles:
              </p>
              <div className="flex flex-col gap-sm">
                {crossFit.map(fit => (
                  <div key={fit.id} className="border border-outline-variant rounded-lg p-md bg-surface-container-low">
                    <div className="text-label-sm font-bold text-on-surface">
                      {fit.position_title} <span className="font-normal text-on-surface-variant">at {fit.company_name}</span>
                    </div>
                    <div className="text-meta text-on-surface-variant mt-xs">
                      Rank #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
                    </div>
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}
        </div>

        {/* Right sidebar — Candidate Vitals */}
        <aside className="xl:w-64 flex-shrink-0">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-card-padding shadow-sm sticky top-24">
            <h3 className="text-label-sm font-bold text-primary uppercase tracking-widest mb-lg">Candidate Vitals</h3>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-md"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEmailDialog(false) }}
        >
          <div className="bg-surface-container-lowest rounded-xl p-card-padding max-w-lg w-full shadow-modal">
            <h3 className="text-headline-md font-bold text-on-surface mb-xs">Suggest a Better-Fit Role</h3>
            <p className="text-body-md text-on-surface-variant mb-gutter">
              Select a role to suggest to <strong>{app.name || app.email}</strong>. An email will be sent via your Gmail.
            </p>
            <div className="flex flex-col gap-sm mb-gutter">
              {crossFit.map(fit => (
                <label
                  key={fit.id}
                  className={`flex items-center gap-md p-md border rounded-xl cursor-pointer transition-colors ${
                    selectedPosting?.id === fit.id
                      ? 'border-primary bg-blue-50'
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
                    <div className="text-label-sm font-bold text-on-surface">{fit.position_title}</div>
                    <div className="text-meta text-on-surface-variant">
                      {fit.company_name} · #{fit.position_in_posting} · {Math.round(fit.rank_score * 100)}% match
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {emailError && <p className="text-error text-label-sm mb-md">{emailError}</p>}
            {emailError?.includes('expired') && (
              <button onClick={reauthorize} className="text-primary underline text-label-sm mb-md">
                Re-authorize Gmail
              </button>
            )}
            <div className="flex justify-end gap-sm">
              <button onClick={() => setShowEmailDialog(false)}
                className="px-lg py-sm border border-outline-variant rounded-xl text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!selectedPosting || sendingEmail}
                className="flex items-center gap-xs bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-bold text-label-sm px-lg py-sm rounded-xl transition-all active:scale-95"
              >
                {sendingEmail ? (
                  <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Sending…</>
                ) : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-surface-container-lowest rounded-xl p-card-padding max-w-sm w-full shadow-modal text-center">
            <span className="material-symbols-outlined text-[48px] text-picture-book-green mb-md block">mark_email_read</span>
            <h3 className="text-headline-md font-bold text-on-surface mb-xs">Email sent!</h3>
            <p className="text-body-md text-on-surface-variant mb-gutter">
              Suggestion for <strong>{selectedPosting?.position_title}</strong> was sent to <strong>{app.email}</strong>.
            </p>
            <button onClick={() => { setEmailSent(false); setShowEmailDialog(false) }}
              className="px-xl py-sm border border-outline-variant rounded-xl text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileSection({ title, icon, children }) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm">
      <h2 className="text-section-head font-bold text-primary uppercase tracking-wider flex items-center gap-sm mb-md">
        {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

function TagCloud({ tags, colorClass }) {
  return (
    <div className="flex flex-wrap gap-sm">
      {tags.map(tag => (
        <span key={tag} className={`px-sm py-xs rounded-full text-meta font-medium ${colorClass}`}>
          {tag}
        </span>
      ))}
    </div>
  )
}

function Vital({ icon, label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="flex items-center gap-sm">
      <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-meta text-on-surface-variant">{label}</div>
        <div className={`text-label-sm font-semibold truncate ${valueClass}`}>{value}</div>
      </div>
    </div>
  )
}
