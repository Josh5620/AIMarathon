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
    if (s >= 0.75) return 'bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400'
    if (s >= 0.5)  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    return 'bg-red-50 dark:bg-red-900/30 text-error'
  }

  if (postingLoading) return (
    <div className="flex items-center gap-sm px-[48px] py-[40px] text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Loading…
    </div>
  )
  if (postingError) return <div className="px-[48px] py-[40px] text-error">{postingError}</div>

  return (
    <div className="min-h-screen bg-surface">
      {/* Sticky header bar with breadcrumb */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-page-margin h-16 flex items-center justify-between gap-md">
        <nav className="flex items-center gap-xs text-meta text-on-surface-variant">
          <button onClick={() => navigate('/recruiter')} className="hover:text-primary transition-colors">
            Dashboard
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{posting.position_title}</span>
        </nav>

        <button
          onClick={() => setHelpOpen(true)}
          className="p-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Help"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>
      </header>

      <div className="max-w-[960px] px-[48px] py-[40px]">
        {/* Posting header — flat, no card */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[40px] gap-md">
          <div>
            <div className="flex items-center gap-sm flex-wrap mb-xs">
              <h1 className="font-serif text-[2.2rem] leading-[1.2] font-normal tracking-[-0.02em] text-on-surface">{posting.position_title}</h1>
              <span className={`inline-flex px-[12px] py-[3px] text-[0.7rem] font-semibold uppercase tracking-[0.06em] ${
                posting.status === 'open'
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-error-container text-error'
              }`}>
                {posting.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-[0.85rem] text-on-surface-variant">{posting.company_name}</p>
            {data && (
              <p className="text-[0.78rem] text-on-surface-variant mt-xs">
                {data.total} applicant{data.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-sm flex-wrap flex-shrink-0">
            {posting.status === 'open'
              ? <button onClick={handleClosePosting} disabled={closingPosting}
                  className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  {closingPosting ? 'Closing…' : 'Close Posting'}
                </button>
              : <button onClick={handleReopenPosting} disabled={closingPosting}
                  className="flex items-center gap-[6px] px-[14px] py-[6px] border border-mantis rounded-none text-[0.78rem] font-medium text-picture-book-green hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  {closingPosting ? 'Reopening…' : 'Reopen Posting'}
                </button>
            }
            <button
              onClick={() => navigate(`/recruiter/postings/${postingId}/report`)}
              className="flex items-center gap-[6px] px-[14px] py-[6px] bg-primary hover:bg-accent-hover text-on-primary font-semibold text-[0.78rem] rounded-none transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
              Report
            </button>
          </div>
        </header>

        {/* Section header — matches dashboard style */}
        <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
          <h2 className="font-heading text-[1.3rem] font-bold text-on-surface">Ranked Applicants</h2>
          {data && <span className="text-[0.78rem] text-on-surface-variant">{data.total} applicant{data.total !== 1 ? 's' : ''}</span>}
        </div>

        {loading && (
          <div className="flex items-center gap-sm text-on-surface-variant text-body-md py-xl">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading applicants…
          </div>
        )}
        {error && <p className="text-error text-body-md">{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant rounded-none p-xl text-center text-on-surface-variant text-body-md">
            No applications yet. Share the job opening link with candidates.
          </div>
        )}

        <div className="flex flex-col">
          {data?.items?.map((app, idx) => {
            const globalRank = (page - 1) * 10 + idx + 1
            return (
              <div
                key={app.application_id}
                onClick={() => navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`)}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-lg py-[24px] px-md border-b cursor-pointer group transition-[background] duration-100 hover:bg-surface-container-low ${
                  app.is_interested ? 'border-mantis' : 'border-outline-variant'
                }`}
              >
                {/* Rank */}
                <span className="text-[0.78rem] font-bold text-on-surface-variant w-8 text-center flex-shrink-0">#{globalRank}</span>

                {/* Main info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-sm flex-wrap mb-[4px]">
                    <span className="font-heading text-[1.25rem] font-bold text-on-surface group-hover:text-primary transition-colors tracking-[-0.01em]">{app.name || 'Unknown'}</span>
                    {app.seniority && (
                      <span className="inline-flex px-[12px] py-[3px] text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {app.seniority}
                      </span>
                    )}
                    {app.years_experience != null && (
                      <span className="text-[0.78rem] text-on-surface-variant">{app.years_experience}y exp</span>
                    )}
                  </div>
                  {app.email && <p className="text-[0.85rem] text-on-surface-variant mb-[6px]">{app.email}</p>}
                  {app.overlap_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {app.overlap_keywords.slice(0, 6).map(kw => (
                        <span key={kw} className="px-sm py-xs text-meta font-medium bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400">
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

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={`font-heading text-[1.5rem] font-extrabold leading-none ${
                    app.rank_score == null ? 'text-on-surface-variant'
                    : app.rank_score >= 0.75 ? 'text-picture-book-green'
                    : app.rank_score >= 0.5 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-error'
                  }`}>{scoreLabel(app.rank_score)}</div>
                  <div className="text-[0.7rem] text-on-surface-variant">match</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-sm flex-shrink-0">
                  <button
                    onClick={e => handleInterested(e, app.application_id, app.is_interested)}
                    title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                    className={`p-xs transition-colors ${
                      app.is_interested
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-outline-variant hover:text-yellow-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: app.is_interested ? "'FILL' 1" : "'FILL' 0" }}>
                      star
                    </span>
                  </button>

                  <button
                    onClick={e => handleDelete(e, app.application_id, app.name)}
                    title="Remove from this posting"
                    className="p-xs text-outline-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
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
          <div className="w-full max-w-lg rounded-none border border-outline-variant bg-surface-container-lowest shadow-modal">
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
