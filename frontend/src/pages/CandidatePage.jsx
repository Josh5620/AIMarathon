import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOpenPostings } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function CandidatePage() {
  const navigate = useNavigate()

  const fetcher = useCallback((page, limit) => listOpenPostings(page, limit), [])
  const { data, loading, error, page, totalPages, setPage } = usePagination(fetcher, 10)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Open Positions</h1>
      <p style={{ color: '#6e665f', marginBottom: 24 }}>
        Browse available roles and apply by uploading your CV.
      </p>

      {loading && <p style={{ color: '#6e665f' }}>Loading postings…</p>}
      {error   && <p style={{ color: '#c0392b' }}>{error}</p>}

      {!loading && data?.items?.length === 0 && (
        <p style={{ color: '#6e665f' }}>No open positions right now. Check back soon.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data?.items?.map(posting => (
          <div
            key={posting.id}
            onClick={() => navigate(`/candidate/postings/${posting.id}`)}
            style={{
              border: '1px solid #e0dbd5',
              borderRadius: 10,
              padding: '20px 24px',
              cursor: 'pointer',
              background: '#fff',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
                  {posting.position_title}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6e665f', marginBottom: 8 }}>
                  {posting.company_name}
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: posting.status === 'open' ? '#e8f5e9' : '#fce4ec',
                color: posting.status === 'open' ? '#2e7d32' : '#880e4f',
                whiteSpace: 'nowrap',
              }}>
                {posting.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: '#4a4a4a',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {posting.description}
            </p>
            <div style={{ marginTop: 12, fontSize: '0.78rem', color: '#9e9892', display: 'flex', gap: 16 }}>
              <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
              <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
