import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOpenPostings, getPosting, applyToPosting } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function CandidatePage() {
  const navigate = useNavigate()

  // list
  const fetcher = useCallback((page, limit) => listOpenPostings(page, limit), [])
  const { data, loading, error, page, totalPages, setPage } = usePagination(fetcher, 10)

  // modal
  const [selectedPostingId, setSelectedPostingId] = useState(null)
  const [modalPosting, setModalPosting]           = useState(null)
  const [modalLoading, setModalLoading]           = useState(false)
  const [modalError, setModalError]               = useState('')

  // apply form (inside modal)
  const [file, setFile]             = useState(null)
  const [dragging, setDragging]     = useState(false)
  const [applying, setApplying]     = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied]       = useState(false)
  const fileInputRef = useRef(null)

  async function openPosting(id) {
    setSelectedPostingId(id)
    setModalPosting(null)
    setModalError('')
    setFile(null)
    setApplied(false)
    setApplyError('')
    setModalLoading(true)
    try {
      const p = await getPosting(id)
      if (!p) setModalError('Posting not found.')
      else setModalPosting(p)
    } catch (e) {
      setModalError(e.message)
    } finally {
      setModalLoading(false)
    }
  }

  function closeModal() {
    setSelectedPostingId(null)
    setModalPosting(null)
    setFile(null)
    setApplied(false)
    setApplyError('')
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setApplyError('') }
  }

  async function handleApply() {
    if (!file) return
    setApplying(true)
    setApplyError('')
    try {
      await applyToPosting(selectedPostingId, file)
      setApplied(true)
    } catch (err) {
      if (err.message.includes('already exists')) {
        setApplied(true)
      } else {
        setApplyError(err.message)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--accent)',
          fontSize: '0.95rem',
          fontWeight: 600,
          padding: '0 0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--sans)',
        }}
      >
        ← Back
      </button>

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
            onClick={() => openPosting(posting.id)}
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

      {/* ── Posting detail modal ─────────────────── */}
      {selectedPostingId && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)',
              borderRadius: 14,
              maxWidth: 700,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '32px',
              position: 'relative',
              boxShadow: '0 12px 48px var(--shadow)',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 14,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                color: '#6e665f',
                lineHeight: 1,
                padding: 4,
              }}
              aria-label="Close"
            >
              ×
            </button>

            {modalLoading && (
              <p style={{ color: '#6e665f', padding: '32px 0', textAlign: 'center' }}>Loading…</p>
            )}

            {modalError && (
              <p style={{ color: '#c0392b' }}>{modalError}</p>
            )}

            {modalPosting && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4, paddingRight: 32 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{modalPosting.position_title}</h2>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                    background: modalPosting.status === 'open' ? '#e8f5e9' : '#fce4ec',
                    color: modalPosting.status === 'open' ? '#2e7d32' : '#880e4f',
                    whiteSpace: 'nowrap',
                  }}>
                    {modalPosting.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p style={{ color: '#6e665f', marginBottom: 24, fontSize: '1rem' }}>{modalPosting.company_name}</p>

                <section style={{ marginBottom: 28 }}>
                  <h3 style={sectionHeadStyle}>Job Description</h3>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#2a2a2a' }}>{modalPosting.description}</p>
                </section>

                {modalPosting.requirements && (
                  <section style={{ marginBottom: 28 }}>
                    <h3 style={sectionHeadStyle}>Requirements</h3>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#2a2a2a' }}>{modalPosting.requirements}</p>
                  </section>
                )}

                {modalPosting.status === 'open' && !applied && (
                  <section>
                    <h3 style={sectionHeadStyle}>Apply for this Role</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6e665f', marginBottom: 12 }}>
                      Upload your CV (PDF or DOCX). No account required.
                    </p>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      style={{
                        border: `2px dashed ${dragging ? 'var(--accent)' : '#c4bfba'}`,
                        borderRadius: 10,
                        padding: '32px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'var(--accent-light)' : '#faf9f8',
                        marginBottom: 12,
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setApplyError('') } }}
                      />
                      {file
                        ? <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent)' }}>{file.name}</p>
                        : <p style={{ margin: 0, color: '#6e665f', fontSize: '0.9rem' }}>
                            Drop your CV here or <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>browse files</span>
                          </p>
                      }
                    </div>

                    {applyError && <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: 8 }}>{applyError}</p>}

                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!file || applying}
                      style={{
                        padding: '10px 28px', fontSize: '0.95rem', fontWeight: 700,
                        border: 'none', borderRadius: 8,
                        background: !file || applying ? '#aaa' : 'var(--accent)',
                        color: '#fff', cursor: !file || applying ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {applying ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </section>
                )}

                {modalPosting.status !== 'open' && (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>This position is no longer accepting applications.</p>
                )}

                {applied && (
                  <div style={{
                    background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10,
                    padding: '20px 24px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                    <h3 style={{ margin: '0 0 8px', color: '#2e7d32' }}>Application received!</h3>
                    <p style={{ margin: 0, color: '#4a4a4a', fontSize: '0.9rem' }}>
                      Your CV has been submitted for <strong>{modalPosting.position_title}</strong> at <strong>{modalPosting.company_name}</strong>.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const sectionHeadStyle = {
  fontSize: '1rem', fontWeight: 700, color: '#3B3430',
  marginBottom: 8, borderBottom: '1px solid #e0dbd5', paddingBottom: 4,
}
