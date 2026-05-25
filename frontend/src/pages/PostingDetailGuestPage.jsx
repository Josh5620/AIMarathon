import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosting, applyToPosting } from '../api'

const backBtnCls = 'bg-transparent border-none cursor-pointer text-primary text-[0.9rem] p-0 underline'
const sectionHeadCls = 'text-section-head font-bold text-on-surface mb-2 border-b border-outline-variant pb-1'

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

  if (loading) return <div className="p-8 text-on-surface-variant">Loading…</div>
  if (error)   return (
    <div className="p-8">
      <p className="text-error mb-3">{error}</p>
      <button onClick={() => navigate('/candidate')} className={backBtnCls}>← Back to postings</button>
    </div>
  )

  return (
    <div className="max-w-[760px] mx-auto py-8 px-4">
      <button onClick={() => navigate('/candidate')} className={backBtnCls}>← All positions</button>

      <div className="mt-5">
        <div className="flex justify-between items-start gap-3 mb-1">
          <h1 className="text-[1.6rem] font-bold m-0">{posting.position_title}</h1>
          <span className={`px-3 py-1 rounded-full text-[0.8rem] font-semibold whitespace-nowrap ${
            posting.status === 'open'
              ? 'bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400'
              : 'bg-pink-50 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300'
          }`}>
            {posting.status === 'open' ? 'Open' : 'Closed'}
          </span>
        </div>
        <p className="text-on-surface-variant mb-6 text-base">{posting.company_name}</p>

        <section className="mb-7">
          <h2 className={sectionHeadCls}>Job Description</h2>
          <p className="whitespace-pre-wrap leading-[1.7] text-on-surface">{posting.description}</p>
        </section>

        {posting.requirements && (
          <section className="mb-7">
            <h2 className={sectionHeadCls}>Requirements</h2>
            <p className="whitespace-pre-wrap leading-[1.7] text-on-surface">{posting.requirements}</p>
          </section>
        )}

        {posting.status === 'open' && !applied && !alreadyApplied && (
          <section>
            <h2 className={sectionHeadCls}>Apply for this Role</h2>
            <p className="text-[0.875rem] text-on-surface-variant mb-3">
              Upload your CV (PDF or DOCX). No account required.
            </p>

            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              className={`border-2 border-dashed rounded-[10px] py-8 px-5 text-center cursor-pointer mb-3 ${
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setApplyError('') } }}
              />
              {file
                ? <p className="m-0 font-semibold text-primary">{file.name}</p>
                : <p className="m-0 text-on-surface-variant text-[0.9rem]">
                    Drop your CV here or <span className="text-primary underline">browse files</span>
                  </p>
              }
            </div>

            {applyError && <p className="text-error text-[0.875rem] mb-2">{applyError}</p>}

            <button
              onClick={handleApply}
              disabled={!file || applying}
              className={`px-7 py-2.5 text-[0.95rem] font-bold border-none rounded-lg text-on-primary cursor-pointer ${
                !file || applying
                  ? 'bg-on-surface-variant/40 cursor-not-allowed'
                  : 'bg-primary'
              }`}
            >
              {applying ? 'Submitting…' : 'Submit Application'}
            </button>
          </section>
        )}

        {posting.status !== 'open' && (
          <p className="text-on-surface-variant italic">This position is no longer accepting applications.</p>
        )}

        {alreadyApplied && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-[10px] px-6 py-5 text-center">
            <h3 className="m-0 mb-2 text-blue-700 dark:text-blue-300">Already applied</h3>
            <p className="m-0 text-on-surface-variant text-[0.9rem]">
              You have already applied to <strong>{posting.position_title}</strong> at <strong>{posting.company_name}</strong> with this CV.
            </p>
          </div>
        )}

        {applied && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-[10px] px-6 py-5 text-center">
            <div className="text-[2rem] mb-2">✓</div>
            <h3 className="m-0 mb-2 text-picture-book-green dark:text-green-400">Application received!</h3>
            <p className="m-0 text-on-surface-variant text-[0.9rem]">
              Your CV has been submitted for <strong>{posting.position_title}</strong> at <strong>{posting.company_name}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
