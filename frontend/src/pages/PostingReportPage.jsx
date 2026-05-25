import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport } from '../api'

export default function PostingReportPage() {
  const { postingId } = useParams()
  const navigate      = useNavigate()

  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    getReport(postingId)
      .then(setReport)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [postingId])

  if (loading) return (
    <div className="flex items-center gap-sm p-[48px] text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      Generating report…
    </div>
  )
  if (error) return <div className="p-[48px] text-error">{error}</div>

  const { posting, applicants } = report
  const interested = applicants.filter(a => a.is_interested)
  const avgMatch = applicants.length
    ? Math.round(applicants.reduce((s, a) => s + (a.rank_score || 0), 0) / applicants.length * 100)
    : null

  const scoreColor = (s) => {
    if (s == null) return 'text-on-surface-variant'
    if (s >= 0.75) return 'text-picture-book-green'
    if (s >= 0.5) return 'text-amber-600 dark:text-amber-400'
    return 'text-error'
  }

  return (
    <>
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-[48px] h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(`/recruiter/postings/${postingId}`)}
          className="flex items-center gap-xs text-[0.85rem] text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to applicants
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-[6px] px-[14px] py-[6px] bg-primary hover:bg-accent-hover text-on-primary font-semibold text-[0.78rem] rounded-none transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Print / Save as PDF
        </button>
      </div>

      <article className="max-w-[960px] px-[48px] py-[40px]">
        {/* Header */}
        <header className="mb-[40px]">
          <h1 className="font-serif text-[2.2rem] leading-[1.2] font-normal tracking-[-0.02em] text-on-surface mb-[4px]">
            Candidate Report
          </h1>
          <h2 className="font-heading text-[1.25rem] font-bold text-on-surface tracking-[-0.01em] mb-[4px]">
            {posting.position_title}
          </h2>
          <p className="text-[0.78rem] text-on-surface-variant">
            {posting.company_name} · {posting.status === 'open' ? 'Open' : 'Closed'} · Generated {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </header>

        {/* Stats row — matches dashboard style */}
        <section className="grid grid-cols-3 gap-px bg-outline-variant border border-outline-variant mb-[48px]">
          <div className="bg-surface-container-lowest p-card-padding text-center">
            <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">{applicants.length}</div>
            <div className="text-[0.78rem] text-on-surface-variant mt-xs">Total applicants</div>
          </div>
          <div className="bg-surface-container-lowest p-card-padding text-center">
            <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">{interested.length}</div>
            <div className="text-[0.78rem] text-on-surface-variant mt-xs">Interested</div>
          </div>
          <div className="bg-surface-container-lowest p-card-padding text-center">
            <div className="font-heading text-[2.4rem] font-extrabold text-on-surface leading-none">{avgMatch != null ? `${avgMatch}%` : '—'}</div>
            <div className="text-[0.78rem] text-on-surface-variant mt-xs">Avg. match</div>
          </div>
        </section>

        {/* Job Description */}
        {posting.description && (
          <section className="mb-[40px]">
            <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
              <h3 className="font-heading text-[1.3rem] font-bold text-on-surface">Job Description</h3>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-on-surface text-[0.875rem]">
              {posting.description}
            </p>
          </section>
        )}

        {/* Requirements */}
        {posting.requirements && (
          <section className="mb-[40px]">
            <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
              <h3 className="font-heading text-[1.3rem] font-bold text-on-surface">Requirements</h3>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-on-surface text-[0.875rem]">
              {posting.requirements}
            </p>
          </section>
        )}

        {/* Ranked Applicants */}
        <section>
          <div className="flex justify-between items-baseline mb-[20px] pb-[12px] border-b-2 border-on-surface">
            <h3 className="font-heading text-[1.3rem] font-bold text-on-surface">Ranked Applicants</h3>
            <span className="text-[0.78rem] text-on-surface-variant">{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</span>
          </div>

          {applicants.length === 0 && (
            <p className="text-on-surface-variant italic text-body-md">No applicants yet.</p>
          )}

          <div className="flex flex-col">
            {applicants.map((app, idx) => (
              <div key={app.application_id} className={`grid grid-cols-[auto_1fr_auto] items-start gap-lg py-[24px] px-md border-b break-inside-avoid ${
                app.is_interested ? 'border-mantis' : 'border-outline-variant'
              }`}>
                {/* Rank */}
                <span className="text-[0.78rem] font-bold text-on-surface-variant w-8 pt-[2px]">#{idx + 1}</span>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-sm flex-wrap mb-[4px]">
                    <span className="font-heading text-[1.1rem] font-bold text-on-surface tracking-[-0.01em]">{app.name || 'Unknown'}</span>
                    {app.is_interested && (
                      <span className="text-amber-600 dark:text-yellow-400 text-[0.85rem]">★ Interested</span>
                    )}
                  </div>
                  {app.email && <div className="text-[0.78rem] text-on-surface-variant mb-[4px]">{app.email}</div>}
                  <div className="flex flex-wrap gap-[16px] text-[0.78rem] text-on-surface-variant mb-[6px]">
                    {app.seniority && <span>{app.seniority}</span>}
                    {app.years_experience != null && <span>{app.years_experience}y exp</span>}
                    {app.location && <span>{app.location}</span>}
                  </div>

                  {app.overlap_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-xs mb-[6px]">
                      {app.overlap_keywords.map(kw => (
                        <span key={kw} className="px-sm py-xs text-[0.68rem] font-medium bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {app.explanation && (
                    <p className="text-[0.85rem] leading-relaxed text-on-surface-variant mt-sm border-t border-outline-variant pt-sm">
                      {app.explanation}
                    </p>
                  )}
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right pt-[2px]">
                  <div className={`font-heading text-[1.5rem] font-extrabold leading-none ${scoreColor(app.rank_score)}`}>
                    {app.rank_score != null ? `${Math.round(app.rank_score * 100)}%` : '—'}
                  </div>
                  <div className="text-[0.7rem] text-on-surface-variant">match</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          article { max-width: 100% !important; margin: 0 !important; }
          main { margin-left: 0 !important; }
        }
      `}</style>
    </>
  )
}
