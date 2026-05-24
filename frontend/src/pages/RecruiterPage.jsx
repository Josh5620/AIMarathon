import { useCallback, useEffect, useState } from 'react'
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
        ? 'bg-green-50 text-picture-book-green'
        : 'bg-pink-50 text-pink-700'
    }`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  )

  return (
    <div className="p-page-margin">
      {/* Page header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-gutter gap-md">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Hello, Recruiter</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            Manage your job postings and find the best candidates.
          </p>
        </div>
        <button
          onClick={() => navigate('/recruiter/postings/new')}
          className="flex items-center gap-sm bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-sm rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Posting
        </button>
      </header>

      {/* Stats bento grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md mb-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">work</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Total Postings</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface">{loading ? '—' : totalPostings}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Active Postings</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface">{loading ? '—' : openPostings}</div>
        </div>

        {/* ToDo: Total Applicants stat — no dedicated API endpoint yet */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding shadow-sm">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">group</span>
            <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">Total Applicants</span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface">
            {statsLoading ? '—' : (postingStats?.total_open_posting_applicants ?? 0)}
          </div>
        </div>
      </section>

      {/* My Postings section */}
      <section>
        <h2 className="text-headline-md font-semibold text-on-surface mb-md">My Postings</h2>

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
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding cursor-pointer group hover:-translate-y-0.5 hover:shadow-card transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-xs flex-wrap">
                    <h3 className="text-headline-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {posting.position_title}
                    </h3>
                    {statusBadge(posting.status)}
                  </div>
                  <p className="text-body-md text-on-surface-variant mb-sm">{posting.company_name}</p>
                  <div className="flex gap-md text-meta text-on-surface-variant">
                    <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
                    <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-sm flex-shrink-0 items-center">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/recruiter/postings/${posting.id}/report`) }}
                    className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                    title="View report"
                  >
                    <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                    Report
                  </button>
                  <button
                    onClick={e => handleDelete(e, posting.id)}
                    className="flex items-center gap-xs px-md py-xs border border-red-200 rounded-lg text-label-sm text-error hover:bg-red-50 transition-colors"
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

      {/* ToDo: "Grow your team intelligently" CTA — decorative only, no action wired */}
      {!loading && totalPostings > 0 && (
        <section className="mt-gutter bg-primary text-on-primary rounded-xl p-card-padding flex flex-col md:flex-row items-center gap-gutter">
          <div className="flex-1">
            <h3 className="text-headline-md font-bold mb-xs">Grow your team intelligently</h3>
            <p className="text-body-md opacity-80">
              AI-powered matching finds the best candidates for every role automatically.
            </p>
          </div>
          <button
            onClick={() => navigate('/recruiter/postings/new')}
            className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-on-primary border border-white/30 font-bold text-label-sm px-lg py-sm rounded-xl transition-all active:scale-95"
          >
            Post a new role
          </button>
        </section>
      )}
    </div>
  )
}
