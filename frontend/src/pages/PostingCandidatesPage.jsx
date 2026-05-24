import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosting, listApplications, toggleInterested, updatePosting, deleteApplication } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function PostingCandidatesPage() {
  const { postingId } = useParams()
  const navigate = useNavigate()

  const [posting, setPosting] = useState(null)
  const [postingLoading, setPostingLoading] = useState(true)
  const [postingError, setPostingError] = useState('')
  const [closingPosting, setClosingPosting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    getPosting(postingId)
      .then(p => { if (!p) setPostingError('Posting not found.'); else setPosting(p) })
      .catch(e => setPostingError(e.message))
      .finally(() => setPostingLoading(false))
  }, [postingId])

  const fetcher = useCallback(
    (page, limit) => listApplications(postingId, page, limit),
    [postingId]
  )
  const { data, loading, error, page, totalPages, setPage, reload } = usePagination(fetcher, 10)

  async function handleDelete(e, applicationId, name) {
    e.stopPropagation()
    if (!confirm(`Remove ${name || 'this applicant'} from this posting? They will remain in any other postings they applied to.`)) return
    try {
      await deleteApplication(applicationId)
      reload()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleInterested(e, applicationId, current) {
    e.stopPropagation()
    try {
      await toggleInterested(applicationId, !current)
      reload()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleClosePosting() {
    if (!confirm('Close this posting? Candidates will no longer be able to apply.')) return
    setClosingPosting(true)
    try {
      const updated = await updatePosting(postingId, { status: 'closed' })
      setPosting(updated)
    } catch (err) {
      alert(err.message)
    } finally {
      setClosingPosting(false)
    }
  }

  async function handleReopenPosting() {
    setClosingPosting(true)
    try {
      const updated = await updatePosting(postingId, { status: 'open' })
      setPosting(updated)
    } catch (err) {
      alert(err.message)
    } finally {
      setClosingPosting(false)
    }
  }

  const scoreLabel = (s) => s == null ? '—' : `${Math.round(s * 100)}%`
  const scoreBg = (s) => {
    if (s == null) return 'bg-surface-container text-on-surface-variant'
    if (s >= 0.75) return 'bg-green-50 text-picture-book-green'
    if (s >= 0.5)  return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-error'
  }

  if (postingLoading) return (
    <div className="flex items-center justify-center p-page-margin text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin mr-sm">progress_activity</span> Loading…
    </div>
  )
  if (postingError) return <div className="p-page-margin text-error">{postingError}</div>

  return (
    <div className="min-h-screen bg-surface">
      {/* Sticky header bar with breadcrumb */}
      <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant px-page-margin h-16 flex items-center justify-between gap-md">
        <nav className="flex items-center gap-xs text-meta text-on-surface-variant">
          <button onClick={() => navigate('/recruiter')} className="hover:text-primary transition-colors">
            Dashboard
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{posting.position_title}</span>
        </nav>

        {/* ToDo: Notifications and Help buttons — no backend */}
        <div className="flex items-center gap-sm">
          <button
            onClick={() => setHelpOpen(true)}
            className="p-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Help"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
        </div>
      </header>

      <div className="p-page-margin">
        {/* Posting header card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-lg mb-gutter">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap mb-xs">
              <h1 className="text-headline-lg font-bold text-primary">{posting.position_title}</h1>
              <span className={`px-sm py-xs rounded-full text-meta font-semibold ${
                posting.status === 'open'
                  ? 'bg-green-50 text-picture-book-green'
                  : 'bg-pink-50 text-pink-700'
              }`}>
                {posting.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-body-md text-on-surface-variant">{posting.company_name}</p>
            {data && (
              <p className="text-meta text-on-surface-variant mt-xs">
                {data.total} applicant{data.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-sm flex-wrap flex-shrink-0">
            {posting.status === 'open'
              ? <button onClick={handleClosePosting} disabled={closingPosting}
                  className="flex items-center gap-xs px-lg py-sm border border-outline-variant rounded-xl text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  {closingPosting ? 'Closing…' : 'Close Posting'}
                </button>
              : <button onClick={handleReopenPosting} disabled={closingPosting}
                  className="flex items-center gap-xs px-lg py-sm border border-mantis rounded-xl text-label-sm text-picture-book-green hover:bg-green-50 transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  {closingPosting ? 'Reopening…' : 'Reopen Posting'}
                </button>
            }
            <button
              onClick={() => navigate(`/recruiter/postings/${postingId}/report`)}
              className="flex items-center gap-xs bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-sm rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
              Report
            </button>
          </div>
        </section>

        {/* Section header + ToDo filter controls */}
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-section-head font-bold text-primary uppercase tracking-wider">
            Ranked Applicants
          </h2>
          {/* ToDo: Filter/sort controls — not wired to API */}
          <button disabled className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface-variant opacity-40 cursor-not-allowed">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filter
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-sm text-on-surface-variant text-body-md py-xl">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading applicants…
          </div>
        )}
        {error && <p className="text-error text-body-md">{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-xl text-center text-on-surface-variant text-body-md">
            No applications yet. Share the job opening link with candidates.
          </div>
        )}

        <div className="flex flex-col gap-md">
          {data?.items?.map((app, idx) => {
            const globalRank = (page - 1) * 10 + idx + 1
            return (
              <div
                key={app.application_id}
                onClick={() => navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`)}
                className={`bg-surface-container-lowest border rounded-xl p-card-padding cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 ${
                  app.is_interested ? 'border-mantis' : 'border-outline-variant'
                }`}
              >
                <div className="flex items-center gap-md">
                  {/* Rank */}
                  <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-label-sm font-bold text-on-surface-variant flex-shrink-0">
                    #{globalRank}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap mb-xs">
                      <span className="text-headline-md font-bold text-on-surface">{app.name || 'Unknown'}</span>
                      {app.seniority && (
                        <span className="px-sm py-xs rounded-full text-meta font-semibold bg-blue-50 text-blue-700">
                          {app.seniority}
                        </span>
                      )}
                      {app.years_experience != null && (
                        <span className="text-meta text-on-surface-variant">{app.years_experience}y exp</span>
                      )}
                    </div>
                    {app.email && <p className="text-label-sm text-on-surface-variant mb-sm">{app.email}</p>}
                    {app.overlap_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-xs">
                        {app.overlap_keywords.slice(0, 6).map(kw => (
                          <span key={kw} className="px-sm py-xs rounded-full text-meta font-medium bg-green-50 text-picture-book-green">
                            {kw}
                          </span>
                        ))}
                        {app.overlap_keywords.length > 6 && (
                          <span className="text-meta text-on-surface-variant self-center">
                            +{app.overlap_keywords.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Score badge */}
                  <div className={`flex-shrink-0 px-md py-sm rounded-xl text-center min-w-[4rem] ${scoreBg(app.rank_score)}`}>
                    <div className="text-headline-md font-bold">{scoreLabel(app.rank_score)}</div>
                    <div className="text-meta opacity-70">match</div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-sm flex-shrink-0">
                    {/* Star / interested toggle */}
                    <button
                      onClick={e => handleInterested(e, app.application_id, app.is_interested)}
                      title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                      className={`p-xs rounded-lg transition-colors ${
                        app.is_interested
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-outline-variant hover:text-yellow-500'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: app.is_interested ? "'FILL' 1" : "'FILL' 0" }}>
                        star
                      </span>
                    </button>

                    {/* View profile */}
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`) }}
                      className="bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-xs rounded-xl transition-all active:scale-95 shadow-sm"
                    >
                      View Profile
                    </button>

                    {/* Delete */}
                    <button
                      onClick={e => handleDelete(e, app.application_id, app.name)}
                      title="Remove from this posting"
                      className="p-xs rounded-lg text-outline-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="applicants-help-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest shadow-modal">
            <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
              <h3 id="applicants-help-title" className="text-headline-md font-bold text-on-surface">Applicants Help</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant"
                aria-label="Close help"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="px-lg py-md text-body-md text-on-surface space-y-sm">
              <p>Use rank and match score to review best-fit candidates first. Higher match percentages indicate stronger alignment to the posting.</p>
              <p>Use the star to shortlist candidates. Starred applicants remain easy to identify while reviewing.</p>
              <p>Use View Profile for complete candidate details, cross-fit options, and interview scheduling.</p>
              <p>Use Report to open a printable summary of all applicants for this posting.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
