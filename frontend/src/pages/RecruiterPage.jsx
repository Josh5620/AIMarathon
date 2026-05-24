import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listMyPostings, deletePosting } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'
import RecruiterHeader from '../components/RecruiterHeader'

export default function RecruiterPage() {
  const navigate = useNavigate()
  const { email, providerToken } = useAuth()

  const fetcher = useCallback(
    (page, limit) => listMyPostings(email, page, limit),
    [email]
  )
  const { data, loading, error, page, totalPages, setPage, reload } = usePagination(fetcher, 10)

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

  return (
    <>
      <RecruiterHeader email={email} providerToken={providerToken} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Job Postings</h1>
            {data && <p style={{ color: '#6e665f', margin: '4px 0 0', fontSize: '0.875rem' }}>{data.total} posting{data.total !== 1 ? 's' : ''}</p>}
          </div>
          <button
            onClick={() => navigate('/recruiter/postings/new')}
            style={{
              padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem',
              border: 'none', borderRadius: 8,
              background: '#000080', color: '#fff', cursor: 'pointer',
            }}
          >
            + New Posting
          </button>
        </div>

        {loading && <p style={{ color: '#6e665f' }}>Loading postings…</p>}
        {error   && <p style={{ color: '#c0392b' }}>{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div style={{
            border: '2px dashed #e0dbd5', borderRadius: 10, padding: '48px 24px',
            textAlign: 'center', color: '#6e665f',
          }}>
            <p style={{ marginBottom: 12 }}>You haven't posted any roles yet.</p>
            <button
              onClick={() => navigate('/recruiter/postings/new')}
              style={{
                padding: '8px 20px', fontWeight: 600, border: 'none',
                borderRadius: 8, background: '#000080', color: '#fff', cursor: 'pointer',
              }}
            >
              Create your first posting
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data?.items?.map(posting => (
            <div
              key={posting.id}
              onClick={() => navigate(`/recruiter/postings/${posting.id}`)}
              style={{
                border: '1px solid #e0dbd5', borderRadius: 10,
                padding: '18px 22px', cursor: 'pointer', background: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 16,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
                    {posting.position_title}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                    background: posting.status === 'open' ? '#e8f5e9' : '#fce4ec',
                    color: posting.status === 'open' ? '#2e7d32' : '#880e4f',
                  }}>
                    {posting.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6e665f' }}>{posting.company_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#9e9892', marginTop: 6, display: 'flex', gap: 16 }}>
                  <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
                  <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={e => handleDelete(e, posting.id)}
                  style={{
                    padding: '6px 12px', fontSize: '0.8rem',
                    border: '1px solid #f5c6c6', borderRadius: 6,
                    background: '#fff5f5', color: '#c0392b', cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  )
}
