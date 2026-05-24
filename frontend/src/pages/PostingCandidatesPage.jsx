import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosting, listApplications, toggleInterested, updatePosting } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function PostingCandidatesPage() {
  const { postingId } = useParams()
  const navigate = useNavigate()

  const [posting, setPosting]       = useState(null)
  const [postingLoading, setPostingLoading] = useState(true)
  const [postingError, setPostingError]     = useState('')
  const [closingPosting, setClosingPosting] = useState(false)

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

  const rankLabel = (score) => {
    if (score == null) return '—'
    const pct = Math.round(score * 100)
    return `${pct}%`
  }

  const rankColor = (score) => {
    if (score == null) return '#9e9892'
    if (score >= 0.75) return '#2e7d32'
    if (score >= 0.5)  return '#e65100'
    return '#c0392b'
  }

  if (postingLoading) return <div style={{ padding: '2rem', color: '#6e665f' }}>Loading…</div>
  if (postingError)   return <div style={{ padding: '2rem', color: '#c0392b' }}>{postingError}</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/recruiter')} style={backBtnStyle}>← All postings</button>

      {/* Posting header */}
      <div style={{
        background: '#fff', border: '1px solid #e0dbd5', borderRadius: 12,
        padding: '20px 24px', marginTop: 20, marginBottom: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{posting.position_title}</h1>
            <p style={{ color: '#6e665f', margin: '4px 0 0', fontSize: '0.9rem' }}>{posting.company_name}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
            <span style={{
              padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: posting.status === 'open' ? '#e8f5e9' : '#fce4ec',
              color: posting.status === 'open' ? '#2e7d32' : '#880e4f',
            }}>
              {posting.status === 'open' ? 'Open' : 'Closed'}
            </span>
            {posting.status === 'open'
              ? <button onClick={handleClosePosting} disabled={closingPosting} style={actionBtnStyle}>Close posting</button>
              : <button onClick={handleReopenPosting} disabled={closingPosting} style={actionBtnStyle}>Reopen posting</button>
            }
            <button
              onClick={() => navigate(`/recruiter/postings/${postingId}/report`)}
              style={{ ...actionBtnStyle, background: '#000080', color: '#fff', border: 'none' }}
            >
              Print report
            </button>
          </div>
        </div>
      </div>

      {/* Candidate list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Applicants {data ? `(${data.total})` : ''}
        </h2>
      </div>

      {loading && <p style={{ color: '#6e665f' }}>Loading applicants…</p>}
      {error   && <p style={{ color: '#c0392b' }}>{error}</p>}

      {!loading && data?.items?.length === 0 && (
        <div style={{
          border: '2px dashed #e0dbd5', borderRadius: 10, padding: '40px 24px',
          textAlign: 'center', color: '#6e665f',
        }}>
          No applications yet. Share the job opening link with candidates.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data?.items?.map((app, idx) => {
          const globalRank = (page - 1) * 10 + idx + 1
          return (
            <div
              key={app.application_id}
              style={{
                border: `1px solid ${app.is_interested ? '#a5d6a7' : '#e0dbd5'}`,
                borderRadius: 10, padding: '16px 20px',
                background: app.is_interested ? '#f9fff9' : '#fff',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16,
              }}
              onClick={() => navigate(`/recruiter/postings/${postingId}/candidates/${app.application_id}`)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Rank badge */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#f0f0f0', fontWeight: 700, fontSize: '0.85rem',
                color: '#555', flexShrink: 0,
              }}>
                #{globalRank}
              </div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.975rem', color: '#1a1a1a' }}>
                    {app.name || 'Unknown'}
                  </span>
                  {app.seniority && (
                    <span style={{
                      padding: '2px 7px', borderRadius: 20, fontSize: '0.7rem',
                      background: '#e3f2fd', color: '#1565c0', fontWeight: 600,
                    }}>
                      {app.seniority}
                    </span>
                  )}
                  {app.years_experience != null && (
                    <span style={{ fontSize: '0.78rem', color: '#6e665f' }}>
                      {app.years_experience}y exp
                    </span>
                  )}
                </div>
                {app.email && <div style={{ fontSize: '0.8rem', color: '#6e665f' }}>{app.email}</div>}
                {app.overlap_keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {app.overlap_keywords.slice(0, 6).map(kw => (
                      <span key={kw} style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem',
                        background: '#e8f5e9', color: '#2e7d32',
                      }}>{kw}</span>
                    ))}
                    {app.overlap_keywords.length > 6 && (
                      <span style={{ fontSize: '0.7rem', color: '#9e9892', alignSelf: 'center' }}>
                        +{app.overlap_keywords.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: rankColor(app.rank_score) }}>
                  {rankLabel(app.rank_score)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9e9892' }}>match</div>
              </div>

              {/* Interested star */}
              <button
                onClick={e => handleInterested(e, app.application_id, app.is_interested)}
                title={app.is_interested ? 'Remove from interested' : 'Mark as interested'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1.4rem', flexShrink: 0, padding: '0 4px',
                  color: app.is_interested ? '#f59e0b' : '#c4bfba',
                }}
              >
                ★
              </button>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#000080', fontSize: '0.9rem', padding: 0, textDecoration: 'underline',
}

const actionBtnStyle = {
  padding: '6px 14px', fontSize: '0.8rem', fontWeight: 500,
  border: '1px solid #c4bfba', borderRadius: 6,
  background: '#fff', color: '#3B3430', cursor: 'pointer',
}
