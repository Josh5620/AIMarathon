import React, { useCallback, useEffect, useState } from 'react' // eslint-disable-line no-unused-vars
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listMyPostings, deletePosting, getMyPostingStats, getRecruiter } from '../api'
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
  const [profile, setProfile] = useState(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!email) return
    let cancelled = false
    setStatsLoading(true)
    Promise.all([
      getMyPostingStats(email),
      getRecruiter(email).catch(() => null),
    ])
      .then(([stats, prof]) => {
        if (!cancelled) {
          setPostingStats(stats)
          setProfile(prof)
        }
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
  const firstName = profile?.name?.split(/\s+/)[0] || 'Recruiter'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

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
    <span className={`inline-flex px-[12px] py-[3px] text-[0.7rem] font-semibold uppercase tracking-[0.06em] flex-shrink-0 ${
      status === 'open'
        ? 'bg-tertiary-container text-on-tertiary-container'
        : 'bg-error-container text-error'
    }`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  )

  return (
    <div className="max-w-[960px] px-[48px] py-[40px]">
      {/* Page header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[40px] gap-md">
        <div>
          <h1 className="font-serif text-[2.2rem] leading-[1.2] font-normal !m-0 tracking-[-0.02em] text-on-surface">{greeting}, {firstName}.</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            Here's what's happening across your pipeline.
          </p>
        </div>
        <button
          onClick={() => navigate('/recruiter/postings/new')}
          className="flex items-center gap-sm bg-primary hover:bg-accent-hover text-on-primary dark:bg-picture-book-green dark:hover:bg-mantis dark:text-white font-heading font-semibold text-label-sm px-lg py-sm rounded-none transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Posting
        </button>
      </header>

      {/* Stats row — joined cells like mockup */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-outline-variant border border-outline-variant mb-[48px]">
        <div className="bg-surface-container-lowest p-card-padding">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-on-surface-variant mb-sm">Open Roles</div>
          <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">{loading ? '—' : openPostings}</div>
          <div className="text-[0.78rem] text-on-surface-variant mt-xs">of {loading ? '—' : totalPostings} total postings</div>
        </div>
        <div className="bg-surface-container-lowest p-card-padding">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-on-surface-variant mb-sm">Total Candidates</div>
          <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">
            {statsLoading ? '—' : (postingStats?.total_open_posting_applicants ?? 0)}
          </div>
        </div>
        <div className="bg-surface-container-lowest p-card-padding">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-on-surface-variant mb-sm">Total Postings</div>
          <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">{loading ? '—' : totalPostings}</div>
        </div>
      </section>

      {/* My Postings section */}
      <section>
        <div className="flex justify-between items-baseline mb-md pb-[12px] border-b-2 border-on-surface">
          <h2 className="font-heading text-[1.3rem] font-bold text-on-surface">My Postings</h2>
          {!loading && <span className="text-[0.78rem] text-on-surface-variant">{totalPostings} posting{totalPostings !== 1 ? 's' : ''}</span>}
        </div>

        {loading && (
          <div className="flex items-center gap-sm text-on-surface-variant text-body-md py-xl">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading postings…
          </div>
        )}
        {error && <p className="text-error text-body-md">{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div className="border-2 border-dashed border-outline-variant rounded-none p-xl text-center">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant mb-md block">work_off</span>
            <p className="text-body-md text-on-surface-variant mb-md">You haven't posted any roles yet.</p>
            <button
              onClick={() => navigate('/recruiter/postings/new')}
              className="bg-primary hover:bg-accent-hover text-on-primary font-bold text-label-sm px-lg py-sm rounded-none transition-all active:scale-95"
            >
              Create your first posting
            </button>
          </div>
        )}

        <div className="flex flex-col">
          {data?.items?.map((posting, idx) => (
            <div
              key={posting.id}
              onClick={() => navigate(`/recruiter/postings/${posting.id}`)}
              className={`grid grid-cols-[1fr_auto] items-start gap-lg py-[24px] px-md border-b border-outline-variant cursor-pointer group transition-[background] duration-100 hover:bg-surface-container-low ${idx === 0 ? 'pt-[20px]' : ''}`}
            >
              <div className="min-w-0">
                <h3 className="font-heading text-[1.25rem] font-bold text-on-surface group-hover:text-primary transition-colors tracking-[-0.01em] mb-[4px]">
                  {posting.position_title}
                </h3>
                <p className="text-[0.85rem] text-on-surface-variant mb-[10px]">{posting.company_name}</p>
                <div className="flex items-center gap-[20px] text-[0.78rem] text-on-surface-variant">
                  {statusBadge(posting.status)}
                  <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full" />
                  <span>Posted {new Date(posting.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex gap-sm flex-shrink-0 items-center self-center">
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/recruiter/postings/${posting.id}/report`) }}
                  className="flex items-center gap-[6px] px-[14px] py-[6px] border border-outline-variant rounded-none text-[0.78rem] font-medium text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors"
                  title="View report"
                >
                  <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                  Report
                </button>
                <button
                  onClick={e => handleDelete(e, posting.id)}
                  className="flex items-center gap-[6px] px-[14px] py-[6px] border border-[#ffccbc] dark:border-red-800 rounded-none text-[0.78rem] font-medium text-error hover:bg-[#fff5f3] dark:hover:bg-red-900/30 transition-colors"
                  title="Delete posting"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>

      {/* ToDo: "Grow your team intelligently" CTA — decorative only, no action wired */}
      {!loading && totalPostings > 0 && (
        <section className="mt-[56px] bg-midnight-mirage dark:bg-surface-container-high text-on-primary rounded-none p-card-padding flex flex-col md:flex-row items-center justify-between gap-gutter">
          <div className="flex-1">
            <h3 className="font-serif text-[1.35rem] font-normal mb-xs text-white dark:text-on-surface">Grow your team intelligently</h3>
            <p className="text-body-md text-white/60 dark:text-on-surface-variant">
              AI-powered matching finds the best candidates for every role.
            </p>
          </div>
          <button
            onClick={() => navigate('/recruiter/postings/new')}
            className="flex-shrink-0 bg-complement dark:bg-mantis dark:text-midnight-mirage hover:brightness-110 text-midnight-mirage font-heading font-semibold text-label-sm px-lg py-sm rounded-none transition-all active:scale-95"
          >
            Post a new role
          </button>
        </section>
      )}
    </div>
  )
}
