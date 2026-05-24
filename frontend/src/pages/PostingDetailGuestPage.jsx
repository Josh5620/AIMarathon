import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosting, applyToPosting } from '../api'

export default function PostingDetailGuestPage() {
  const { postingId } = useParams()
  const navigate = useNavigate()

  const [posting, setPosting]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied]   = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    getPosting(postingId)
      .then(p => { if (!p) setError('Posting not found.'); else setPosting(p) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [postingId])

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
      await applyToPosting(postingId, file)
      setApplied(true)
    } catch (err) {
      if (err.message.includes('already applied to this posting')) {
        setAlreadyApplied(true)
      } else {
        setApplyError(err.message)
      }
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#6e665f' }}>Loading…</div>
  if (error)   return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: '#c0392b', marginBottom: 12 }}>{error}</p>
      <button onClick={() => navigate('/candidate')} style={backBtnStyle}>← Back to postings</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/candidate')} style={backBtnStyle}>← All positions</button>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{posting.position_title}</h1>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
            background: posting.status === 'open' ? '#e8f5e9' : '#fce4ec',
            color: posting.status === 'open' ? '#2e7d32' : '#880e4f',
            whiteSpace: 'nowrap',
          }}>
            {posting.status === 'open' ? 'Open' : 'Closed'}
          </span>
        </div>
        <p style={{ color: '#6e665f', marginBottom: 24, fontSize: '1rem' }}>{posting.company_name}</p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionHeadStyle}>Job Description</h2>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#2a2a2a' }}>{posting.description}</p>
        </section>

        {posting.requirements && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={sectionHeadStyle}>Requirements</h2>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#2a2a2a' }}>{posting.requirements}</p>
          </section>
        )}

        {posting.status === 'open' && !applied && !alreadyApplied && (
          <section>
            <h2 style={sectionHeadStyle}>Apply for this Role</h2>
            <p style={{ fontSize: '0.875rem', color: '#6e665f', marginBottom: 12 }}>
              Upload your CV (PDF or DOCX). No account required.
            </p>

            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              style={{
                border: `2px dashed ${dragging ? '#000080' : '#c4bfba'}`,
                borderRadius: 10,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? '#f0f0ff' : '#faf9f8',
                marginBottom: 12,
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setApplyError('') } }}
              />
              {file
                ? <p style={{ margin: 0, fontWeight: 600, color: '#000080' }}>{file.name}</p>
                : <p style={{ margin: 0, color: '#6e665f', fontSize: '0.9rem' }}>
                    Drop your CV here or <span style={{ color: '#000080', textDecoration: 'underline' }}>browse files</span>
                  </p>
              }
            </div>

            {applyError && <p style={{ color: '#c0392b', fontSize: '0.875rem', marginBottom: 8 }}>{applyError}</p>}

            <button
              onClick={handleApply}
              disabled={!file || applying}
              style={{
                padding: '10px 28px', fontSize: '0.95rem', fontWeight: 700,
                border: 'none', borderRadius: 8,
                background: !file || applying ? '#aaa' : '#000080',
                color: '#fff', cursor: !file || applying ? 'not-allowed' : 'pointer',
              }}
            >
              {applying ? 'Submitting…' : 'Submit Application'}
            </button>
          </section>
        )}

        {posting.status !== 'open' && (
          <p style={{ color: '#888', fontStyle: 'italic' }}>This position is no longer accepting applications.</p>
        )}

        {alreadyApplied && (
          <div style={{
            background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10,
            padding: '20px 24px', textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#1565c0' }}>Already applied</h3>
            <p style={{ margin: 0, color: '#4a4a4a', fontSize: '0.9rem' }}>
              You have already applied to <strong>{posting.position_title}</strong> at <strong>{posting.company_name}</strong> with this CV.
            </p>
          </div>
        )}

        {applied && (
          <div style={{
            background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10,
            padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
            <h3 style={{ margin: '0 0 8px', color: '#2e7d32' }}>Application received!</h3>
            <p style={{ margin: 0, color: '#4a4a4a', fontSize: '0.9rem' }}>
              Your CV has been submitted for <strong>{posting.position_title}</strong> at <strong>{posting.company_name}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#000080', fontSize: '0.9rem', padding: 0, textDecoration: 'underline',
}

const sectionHeadStyle = {
  fontSize: '1rem', fontWeight: 700, color: '#3B3430',
  marginBottom: 8, borderBottom: '1px solid #e0dbd5', paddingBottom: 4,
}
