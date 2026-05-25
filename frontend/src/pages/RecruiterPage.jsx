import React, { useCallback, useEffect, useState } from 'react' // eslint-disable-line no-unused-vars
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listMyPostings, deletePosting, getMyPostingStats } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function RecruiterPage() {
  const navigate = useNavigate()
  const { email } = useAuth()

  const fetcher = useCallback(
    (page, limit) => listMyPostings(email, page, limit),
    [email]
  )
  const { data, loading, error, page, totalPages, setPage, reload } = usePagination(fetcher, 10)
  const [postingStats, setPostingStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!email) return
    let cancelled = false
    setStatsLoading(true)
    getMyPostingStats(email)
      .then((stats) => {
        if (!cancelled) setPostingStats(stats)
      })
      .catch(() => {
        if (!cancelled) setPostingStats(null)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [email, data?.total])
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalPostings = data?.total ?? 0
  const openPostings = postingStats?.total_open_postings ?? 0

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this posting? This will also remove all applications.')) return
    try {
      await deletePosting(id)
      reload()
    } catch (err) {
      alert(err.message)
    }
  }

  const statusBadge = (status) => (
    <span className={`px-sm py-xs rounded-full text-meta font-semibold flex-shrink-0 ${
      status === 'open'
        ? 'bg-complement/10 text-picture-book-green dark:bg-complement/15 dark:text-complement'
        : 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
    }`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  )

  return (
    <div className="p-md md:p-page-margin">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-gutter gap-md">
        <div>
          <h1 className="font-heading text-[1.5rem] sm:text-[2rem] font-normal text-on-surface tracking-tight">Dashboard</h1>
          <p className="text-meta font-mono text-on-surface-variant mt-sm tracking-wide uppercase">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/recruiter/postings/new')}
          className="w-full sm:w-auto flex items-center justify-center gap-sm bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-sm rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Posting
        </button>
      </header>

      {/* Stats bento grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md mb-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">work</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Total Postings</span>
          </div>
          <div className="text-headline-lg font-brand font-bold text-on-surface">{loading ? '—' : totalPostings}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Active Postings</span>
          </div>
          <div className="text-headline-lg font-brand font-bold text-on-surface">{loading ? '—' : openPostings}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">group</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Total Applicants</span>
          </div>
          <div className="text-headline-lg font-brand font-bold text-on-surface">
            {statsLoading ? '—' : (postingStats?.total_open_posting_applicants ?? 0)}
          </div>
        </div>
      </section>

      {/* My Postings section */}
      <section>
        <h2 className="font-brand text-[1.5rem] font-semibold text-on-surface mb-lg">Postings</h2>

        {loading && (
          <div className="flex items-center gap-sm text-on-surface-variant text-body-md py-xl">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading postings…
          </div>
        )}
        {error && <p className="text-error text-body-md">{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-xl text-center">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant mb-md block">work_off</span>
            <p className="text-body-md text-on-surface-variant mb-md">You haven't posted any roles yet.</p>
            <button
              onClick={() => navigate('/recruiter/postings/new')}
              className="bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-sm rounded-lg transition-all active:scale-95"
            >
              Create your first posting
            </button>
          </div>
        )}

        <div className="flex flex-col gap-md">
          {data?.items?.map(posting => (
            <div
              key={posting.id}
              onClick={() => navigate(`/recruiter/postings/${posting.id}`)}
              className="bg-surface-container-lowest border-b border-outline-variant py-lg px-md cursor-pointer group hover:bg-surface-container-low transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-sm sm:gap-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-xs flex-wrap">
                    <h3 className="text-headline-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {posting.position_title}
                    </h3>
                    {statusBadge(posting.status)}
                  </div>
                  <p className="text-body-md text-on-surface-variant mb-sm">{posting.company_name}</p>
                  <div className="flex gap-md text-meta text-on-surface-variant flex-wrap">
                    <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
                    <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-sm flex-shrink-0 items-center">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/recruiter/postings/${posting.id}/report`) }}
                    className="flex items-center gap-xs px-sm sm:px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                    title="View report"
                  >
                    <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                    <span className="hidden sm:inline">Report</span>
                  </button>
                  <button
                    onClick={e => handleDelete(e, posting.id)}
                    className="flex items-center gap-xs px-sm sm:px-md py-xs border border-red-200 dark:border-red-800 rounded-lg text-label-sm text-error hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Delete posting"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>

    </div>
  )
}
