import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosting, listApplications, toggleInterested, updatePosting, deleteApplication } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

function DualRangeSlider({ value, onChange }) {
  const [lo, hi] = value

  const handleLo = (e) => {
    const v = Math.min(Number(e.target.value), hi - 1)
    onChange([v, hi])
  }

  const handleHi = (e) => {
    const v = Math.max(Number(e.target.value), lo + 1)
    onChange([lo, v])
  }

  const loZ = lo >= hi - 2 ? 4 : 2

  const thumbCls = `
    absolute w-full h-full bg-transparent appearance-none outline-none pointer-events-none
    [&::-webkit-slider-thumb]:pointer-events-auto
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:h-[16px]
    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface
    [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-grab
    [&::-webkit-slider-thumb]:active:cursor-grabbing
    [&::-webkit-slider-runnable-track]:bg-transparent
    [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:h-[16px]
    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary
    [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface
    [&::-moz-range-thumb]:cursor-grab
    [&::-moz-range-track]:bg-transparent
  `

  return (
    <div className="relative flex items-center h-5">
      {/* Track */}
      <div className="absolute inset-x-0 h-[3px] rounded-full bg-outline-variant pointer-events-none">
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
      </div>
      <input
        type="range" min={0} max={100} step={1} value={lo}
        onChange={handleLo}
        className={thumbCls}
        style={{ zIndex: loZ }}
      />
      <input
        type="range" min={0} max={100} step={1} value={hi}
        onChange={handleHi}
        className={thumbCls}
        style={{ zIndex: 3 }}
      />
    </div>
  )
}

export default function PostingCandidatesPage() {
  const { postingId } = useParams()
  const navigate = useNavigate()

  const [posting, setPosting] = useState(null)
  const [postingLoading, setPostingLoading] = useState(true)
  const [postingError, setPostingError] = useState('')
  const [closingPosting, setClosingPosting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Filter state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortDir, setSortDir] = useState('desc')
  const [scoreRange, setScoreRange] = useState([0, 100])

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

  const displayedItems = useMemo(() => {
    if (!data?.items) return []
    let items = [...data.items]

    const [lo, hi] = scoreRange
    if (lo !== 0 || hi !== 100) {
      items = items.filter(app => {
        if (app.rank_score == null) return lo === 0
        const pct = Math.round(app.rank_score * 100)
        return pct >= lo && pct <= hi
      })
    }

    if (sortDir === 'asc') {
      items.sort((a, b) => (a.rank_score ?? -1) - (b.rank_score ?? -1))
    }

    return items
  }, [data?.items, sortDir, scoreRange])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (sortDir !== 'desc') n++
    if (scoreRange[0] !== 0 || scoreRange[1] !== 100) n++
    return n
  }, [sortDir, scoreRange])

  function resetFilters() {
    setSortDir('desc')
    setScoreRange([0, 100])
  }

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
    <div className="flex items-center justify-center p-page-margin text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin mr-sm">progress_activity</span> Loading…
    </div>
  )
  if (postingError) return <div className="p-page-margin text-error">{postingError}</div>

  const isScoreFiltered = scoreRange[0] !== 0 || scoreRange[1] !== 100
  const shownCount = displayedItems.length
  const totalCount = data?.items?.length ?? 0

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

      <div className="p-page-margin">
        {/* Posting header card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-lg mb-gutter">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap mb-xs">
              <h1 className="text-headline-lg font-bold text-primary">{posting.position_title}</h1>
              <span className={`px-sm py-xs rounded-full text-meta font-semibold ${
                posting.status === 'open'
                  ? 'bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400'
                  : 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
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
                  className="flex items-center gap-xs px-lg py-sm border border-mantis rounded-xl text-label-sm text-picture-book-green hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50">
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

        {/* Section header + filter controls */}
        <div className="flex items-center justify-between mb-md">
          <div className="flex items-center gap-sm">
            <h2 className="text-section-head font-bold text-primary uppercase tracking-wider">
              Ranked Applicants
            </h2>
            {!loading && isScoreFiltered && (
              <span className="text-meta text-on-surface-variant">
                {shownCount} of {totalCount} shown
              </span>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-xs px-md py-xs border rounded-lg text-label-sm transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filter
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding mb-md shadow-sm">
            <div className="flex flex-col sm:flex-row gap-lg">

              {/* Sort direction */}
              <div className="flex-shrink-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-sm">Sort Order</p>
                <div className="flex border border-outline-variant rounded-lg overflow-hidden text-label-sm">
                  <button
                    onClick={() => setSortDir('desc')}
                    className={`flex items-center gap-xs px-md py-sm transition-colors ${
                      sortDir === 'desc'
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    Highest first
                  </button>
                  <div className="w-px bg-outline-variant" />
                  <button
                    onClick={() => setSortDir('asc')}
                    className={`flex items-center gap-xs px-md py-sm transition-colors ${
                      sortDir === 'asc'
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    Lowest first
                  </button>
                </div>
              </div>

              {/* Score range */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-sm">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Match Score Range</p>
                  <span className="text-label-sm font-semibold text-primary tabular-nums">
                    {scoreRange[0]}% — {scoreRange[1]}%
                  </span>
                </div>
                <DualRangeSlider value={scoreRange} onChange={setScoreRange} />
                <div className="flex justify-between mt-xs text-[0.68rem] text-on-surface-variant tabular-nums">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-md pt-md border-t border-outline-variant flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-label-sm text-on-surface-variant hover:text-error transition-colors flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}

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

        {!loading && data?.items?.length > 0 && displayedItems.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-xl text-center text-on-surface-variant text-body-md">
            No applicants match the current score range. Try widening the filter.
          </div>
        )}

        <div className="flex flex-col gap-md">
          {displayedItems.map((app, idx) => {
            const globalRank = (page - 1) * 10 + data.items.indexOf(app) + 1
            return (
              <div
                key={app.application_id}
                onClick={() => navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`)}
                className={`bg-surface-container-lowest border rounded-xl p-card-padding cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 ${
                  app.is_interested ? 'border-mantis' : 'border-outline-variant'
                }`}
              >
                {/* Top: rank + info + score */}
                <div className="flex items-start gap-md">
                  <div className="w-9 h-9 bg-surface-container flex items-center justify-center text-label-sm font-bold text-on-surface-variant flex-shrink-0">
                    #{globalRank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap mb-xs">
                      <span className="text-headline-md font-bold text-on-surface">{app.name || 'Unknown'}</span>
                      {app.seniority && (
                        <span className="px-sm py-xs text-meta font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
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

                  <div className={`flex-shrink-0 px-md py-sm text-center min-w-[4rem] ${scoreBg(app.rank_score)}`}>
                    <div className="text-headline-md font-bold">{scoreLabel(app.rank_score)}</div>
                    <div className="text-meta opacity-70">match</div>
                  </div>
                </div>

                {/* Bottom: actions */}
                <div className="flex items-center justify-end gap-sm mt-md pt-sm border-t border-outline-variant">
                  <button
                    onClick={e => handleInterested(e, app.application_id, app.is_interested)}
                    title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                    className={`p-xs transition-colors ${
                      app.is_interested
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-outline-variant hover:text-yellow-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: app.is_interested ? "'FILL' 1" : "'FILL' 0" }}>
                      star
                    </span>
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`) }}
                    className="bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-xs transition-all active:scale-95 shadow-sm"
                  >
                    View Profile
                  </button>

                  <button
                    onClick={e => handleDelete(e, app.application_id, app.name)}
                    title="Remove from this posting"
                    className="p-xs text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
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
              <p>Use the Filter button to sort by ascending or descending score, or narrow results to a specific match percentage range.</p>
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
