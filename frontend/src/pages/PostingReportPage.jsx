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

  if (loading) return <div style={{ padding: '2rem', color: '#6e665f' }}>Generating report…</div>
  if (error)   return <div style={{ padding: '2rem', color: '#c0392b' }}>{error}</div>

  const { posting, applicants } = report

  return (
    <>
      {/* Non-printable toolbar */}
      <div className="no-print" style={{
        display: 'flex', gap: 12, padding: '12px 24px',
        borderBottom: '1px solid #e0dbd5', background: '#faf9f8',
        alignItems: 'center',
      }}>
        <button onClick={() => navigate(`/recruiter/postings/${postingId}`)} style={backBtnStyle}>
          ← Back to applicants
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 20px', fontWeight: 700, border: 'none',
            borderRadius: 8, background: '#000080', color: '#fff', cursor: 'pointer',
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      <article style={{ maxWidth: 820, margin: '24px auto', padding: '0 1rem 3rem' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: 16, marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 4px' }}>
            Candidate Report
          </h1>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px', color: '#3B3430' }}>
            {posting.position_title}
          </h2>
          <p style={{ margin: 0, color: '#6e665f', fontSize: '0.875rem' }}>
            {posting.company_name} · Status: {posting.status} · Generated {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Posting summary */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={sectionHead}>Job Description</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#2a2a2a', fontSize: '0.875rem' }}>
            {posting.description}
          </p>
          {posting.requirements && (
            <>
              <h3 style={{ ...sectionHead, marginTop: 16 }}>Requirements</h3>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#2a2a2a', fontSize: '0.875rem' }}>
                {posting.requirements}
              </p>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 20, marginBottom: 28,
          padding: '14px 18px', background: '#f5f5f5', borderRadius: 8,
        }}>
          <Stat label="Total applicants" value={applicants.length} />
          <Stat label="Interested" value={applicants.filter(a => a.is_interested).length} />
          <Stat label="Avg. match" value={
            applicants.length
              ? `${Math.round(applicants.reduce((s, a) => s + (a.rank_score || 0), 0) / applicants.length * 100)}%`
              : '—'
          } />
        </div>

        {/* Candidate rows */}
        <h3 style={sectionHead}>Ranked Applicants</h3>

        {applicants.length === 0 && (
          <p style={{ color: '#6e665f', fontStyle: 'italic' }}>No applicants yet.</p>
        )}

        {applicants.map((app, idx) => (
          <div key={app.application_id} style={{
            border: '1px solid #e0dbd5', borderRadius: 10, padding: '16px 18px',
            marginBottom: 14, pageBreakInside: 'avoid',
            background: app.is_interested ? '#f9fff9' : '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>#{idx + 1} {app.name || 'Unknown'}</span>
                {app.is_interested && (
                  <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: '0.9rem' }}>★ Interested</span>
                )}
                {app.email && <div style={{ fontSize: '0.8rem', color: '#6e665f', marginTop: 2 }}>{app.email}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: '0.78rem', color: '#555' }}>
                  {app.seniority && <span>{app.seniority}</span>}
                  {app.years_experience != null && <span>{app.years_experience}y exp</span>}
                  {app.location && <span>{app.location}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: '1.3rem', fontWeight: 800,
                  color: app.rank_score >= 0.75 ? '#2e7d32' : app.rank_score >= 0.5 ? '#e65100' : '#c0392b',
                }}>
                  {app.rank_score != null ? `${Math.round(app.rank_score * 100)}%` : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9e9892' }}>match</div>
              </div>
            </div>

            {app.overlap_keywords?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                {app.overlap_keywords.map(kw => (
                  <span key={kw} style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', background: '#e8f5e9', color: '#2e7d32' }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {app.explanation && (
              <p style={{ marginTop: 10, fontSize: '0.85rem', lineHeight: 1.6, color: '#2a2a2a', borderTop: '1px solid #e0dbd5', paddingTop: 10 }}>
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
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#6e665f' }}>{label}</div>
    </div>
  )
}

const sectionHead = {
  fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: '#6e665f',
  margin: '0 0 10px', borderBottom: '1px solid #e0dbd5', paddingBottom: 4,
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#000080', fontSize: '0.9rem', padding: 0, textDecoration: 'underline',
}
