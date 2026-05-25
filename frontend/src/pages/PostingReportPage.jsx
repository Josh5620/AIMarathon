import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport } from '../api'

const sectionHeadCls = 'text-label-sm font-bold uppercase tracking-wide text-on-surface-variant mb-2.5 border-b border-outline-variant pb-1'
const backBtnCls = 'bg-transparent border-none cursor-pointer text-primary text-[0.9rem] p-0 underline'

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

  if (loading) return <div className="p-8 text-on-surface-variant">Generating report…</div>
  if (error)   return <div className="p-8 text-error">{error}</div>

  const { posting, applicants } = report

  return (
    <>
      {/* Non-printable toolbar */}
      <div className="no-print flex gap-3 px-6 py-3 border-b border-outline-variant bg-surface-container-lowest items-center">
        <button onClick={() => navigate(`/recruiter/postings/${postingId}`)} className={backBtnCls}>
          ← Back to applicants
        </button>
        <span className="flex-1" />
        <button
          onClick={() => window.print()}
          className="px-5 py-2 font-bold border-none rounded-lg bg-primary text-on-primary cursor-pointer"
        >
          Print / Save as PDF
        </button>
      </div>

      <article className="max-w-[820px] mx-auto px-4 pb-12 mt-6">
        {/* Header */}
        <div className="border-b-2 border-on-surface pb-4 mb-6">
          <h1 className="text-[1.6rem] font-bold mb-1">
            Candidate Report
          </h1>
          <h2 className="text-[1.1rem] font-semibold mb-1 text-on-surface">
            {posting.position_title}
          </h2>
          <p className="m-0 text-on-surface-variant text-[0.875rem]">
            {posting.company_name} · Status: {posting.status} · Generated {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Posting summary */}
        <div className="mb-7">
          <h3 className={sectionHeadCls}>Job Description</h3>
          <p className="whitespace-pre-wrap leading-relaxed text-on-surface text-[0.875rem]">
            {posting.description}
          </p>
          {posting.requirements && (
            <>
              <h3 className={`${sectionHeadCls} mt-4`}>Requirements</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-on-surface text-[0.875rem]">
                {posting.requirements}
              </p>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-5 mb-7 px-4 py-3.5 bg-surface-container rounded-lg">
          <Stat label="Total applicants" value={applicants.length} />
          <Stat label="Interested" value={applicants.filter(a => a.is_interested).length} />
          <Stat label="Avg. match" value={
            applicants.length
              ? `${Math.round(applicants.reduce((s, a) => s + (a.rank_score || 0), 0) / applicants.length * 100)}%`
              : '—'
          } />
        </div>

        {/* Candidate rows */}
        <h3 className={sectionHeadCls}>Ranked Applicants</h3>

        {applicants.length === 0 && (
          <p className="text-on-surface-variant italic">No applicants yet.</p>
        )}

        {applicants.map((app, idx) => (
          <div key={app.application_id} className={`border border-outline-variant rounded-[10px] px-4 py-4 mb-3.5 break-inside-avoid ${
            app.is_interested ? 'bg-green-50 dark:bg-green-900/20' : 'bg-surface-container-lowest'
          }`}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="font-bold text-base">#{idx + 1} {app.name || 'Unknown'}</span>
                {app.is_interested && (
                  <span className="ml-2 text-yellow-500 text-[0.9rem]">★ Interested</span>
                )}
                {app.email && <div className="text-[0.8rem] text-on-surface-variant mt-0.5">{app.email}</div>}
                <div className="flex flex-wrap gap-2 mt-1.5 text-[0.78rem] text-on-surface-variant">
                  {app.seniority && <span>{app.seniority}</span>}
                  {app.years_experience != null && <span>{app.years_experience}y exp</span>}
                  {app.location && <span>{app.location}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[1.3rem] font-extrabold ${
                  app.rank_score >= 0.75
                    ? 'text-picture-book-green dark:text-green-400'
                    : app.rank_score >= 0.5
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-error'
                }`}>
                  {app.rank_score != null ? `${Math.round(app.rank_score * 100)}%` : '—'}
                </div>
                <div className="text-[0.7rem] text-on-surface-variant">match</div>
              </div>
            </div>

            {app.overlap_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {app.overlap_keywords.map(kw => (
                  <span key={kw} className="px-2 py-0.5 rounded-full text-[0.68rem] bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {app.explanation && (
              <p className="mt-2.5 text-label-sm leading-relaxed text-on-surface border-t border-outline-variant pt-2.5">
                {app.explanation}
              </p>
            )}
          </div>
        ))}
      </article>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          article { max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[1.4rem] font-extrabold text-on-surface">{value}</div>
      <div className="text-[0.75rem] text-on-surface-variant">{label}</div>
    </div>
  )
}
