import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { listOpenPostings, getPosting, applyToPosting } from '../api'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/Pagination'
import ThemeToggle from '../components/ThemeToggle'

export default function CandidatePage() {
  const navigate = useNavigate()

  const fetcher = useCallback((page, limit) => listOpenPostings(page, limit), [])
  const { data, loading, error, page, totalPages, setPage } = usePagination(fetcher, 10)

  // modal state
  const [selectedPostingId, setSelectedPostingId] = useState(null)
  const [modalPosting, setModalPosting] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalAnimating, setModalAnimating] = useState(false)

  // apply form
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied] = useState(false)
  const fileInputRef = useRef(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalVisible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalVisible])

  async function openPosting(id) {
    setSelectedPostingId(id)
    setModalPosting(null)
    setModalError('')
    setFile(null)
    setApplied(false)
    setApplyError('')
    setModalLoading(true)
    // Show modal immediately (starts hidden/scaled for animation)
    setModalVisible(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setModalAnimating(true))
    })
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
    setModalAnimating(false)
    setTimeout(() => {
      setModalVisible(false)
      setSelectedPostingId(null)
      setModalPosting(null)
      setFile(null)
      setApplied(false)
      setApplyError('')
    }, 300)
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
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-page-margin h-16 flex items-center gap-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-xs text-label-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back
        </button>
        <div className="flex items-center gap-sm ml-auto">
          <ThemeToggle inline />
          <img src="/logo.png" alt="HireLite" className="w-7 h-7 object-contain" />
          <span className="text-section-head font-bold text-primary">HireLite</span>
        </div>
      </header>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-page-margin py-gutter">
        <h1 className="text-page-title font-bold text-on-surface mb-xs">Open Positions</h1>
        <p className="text-body-md text-on-surface-variant mb-gutter">
          Browse available roles and apply by uploading your CV. No account required.
        </p>

        {loading && (
          <div className="flex items-center gap-sm text-on-surface-variant text-body-md py-xl">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading positions…
          </div>
        )}
        {error && <p className="text-error text-body-md">{error}</p>}

        {!loading && data?.items?.length === 0 && (
          <div className="text-center py-xl text-on-surface-variant text-body-md">
            No open positions right now. Check back soon.
          </div>
        )}

        {/* Job cards */}
        <div className="flex flex-col gap-md">
          {data?.items?.map(posting => (
            <button
              key={posting.id}
              onClick={() => openPosting(posting.id)}
              className="w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-card-padding hover:shadow-card transition-all duration-200 group"
            >
              <div className="flex justify-between items-start gap-md">
                <div className="flex-1 min-w-0">
                  <h2 className="text-headline-md font-bold text-on-surface mb-xs group-hover:text-primary transition-colors truncate">
                    {posting.position_title}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mb-sm">{posting.company_name}</p>
                </div>
                <span className={`flex-shrink-0 px-sm py-xs rounded-full text-meta font-semibold ${
                  posting.status === 'open'
                    ? 'bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400'
                    : 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                }`}>
                  {posting.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
              <p className="text-body-md text-on-surface line-clamp-2 mb-md">{posting.description}</p>
              <div className="flex gap-md text-meta text-on-surface-variant">
                <span>{posting.applicant_count ?? 0} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
                <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {/* Modal */}
      {modalVisible && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-sm sm:p-md transition-opacity duration-300 ${
            modalAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="posting-modal-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-surface-container-lowest border border-outline-variant shadow-modal transition-all duration-300 ${
              modalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {/* Fixed header */}
            <div className="flex-shrink-0 border-b border-outline-variant rounded-t-xl px-lg py-md">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-sm">
                    <h2 id="posting-modal-title" className="text-headline-md font-bold text-on-surface truncate">
                      {modalPosting?.position_title ?? 'Loading...'}
                    </h2>
                    {modalPosting && (
                      <span className={`flex-shrink-0 px-sm py-xs rounded-full text-meta font-semibold ${
                        modalPosting.status === 'open'
                          ? 'bg-green-50 dark:bg-green-900/30 text-picture-book-green dark:text-green-400'
                          : 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                      }`}>
                        {modalPosting.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    )}
                  </div>
                  {modalPosting && (
                    <div className="flex items-center gap-md mt-xs text-meta text-on-surface-variant">
                      <span>{modalPosting.company_name}</span>
                      {modalPosting.applicant_count != null && (
                        <>
                          <span className="opacity-30">·</span>
                          <span>{modalPosting.applicant_count} applicant{modalPosting.applicant_count !== 1 ? 's' : ''}</span>
                        </>
                      )}
                      {modalPosting.created_at && (
                        <>
                          <span className="opacity-30">·</span>
                          <span>Posted {new Date(modalPosting.created_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-lg py-lg">
              {modalLoading && (
                <div className="flex items-center justify-center py-xl gap-sm text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Loading...
                </div>
              )}

              {modalError && <p className="text-error text-body-md">{modalError}</p>}

              {modalPosting && (
                <div className="flex flex-col gap-lg">
                  {/* Job Description */}
                  <section>
                    <h3 className="text-section-head font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-xs mb-md">
                      Job Description
                    </h3>
                    <p className="text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">{modalPosting.description}</p>
                  </section>

                  {/* Requirements */}
                  {modalPosting.requirements && (
                    <section>
                      <h3 className="text-section-head font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-xs mb-md">
                        Requirements
                      </h3>
                      <p className="text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">{modalPosting.requirements}</p>
                    </section>
                  )}

                  {/* Apply section */}
                  {modalPosting.status === 'open' && !applied && (
                    <section className="pt-lg">
                      <h3 className="text-section-head font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-xs mb-md">
                        Apply for this Role
                      </h3>
                      <p className="text-body-md text-on-surface-variant mb-md">
                        Upload your CV (PDF or DOCX). No account required.
                      </p>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        className={`border-2 border-dashed rounded-xl p-xl text-center cursor-pointer transition-all duration-200 ${
                          dragging
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/30'
                            : file
                              ? 'border-mantis bg-green-50 dark:bg-green-900/30'
                              : 'border-outline-variant hover:border-primary hover:bg-surface-container-low'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) { setFile(f); setApplyError('') }
                          }}
                        />
                        {file ? (
                          <div className="flex items-center justify-center gap-sm">
                            <span className="material-symbols-outlined text-picture-book-green">description</span>
                            <span className="text-label-sm font-semibold text-picture-book-green">{file.name}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-sm block">upload_file</span>
                            <p className="text-body-md text-on-surface-variant">
                              Drop your CV here or{' '}
                              <span className="text-primary underline">browse files</span>
                            </p>
                            <p className="text-meta text-on-surface-variant mt-xs">PDF, DOCX, DOC, PNG, JPG accepted</p>
                          </div>
                        )}
                      </div>

                      {applyError && (
                        <p className="text-error text-label-sm mt-sm">{applyError}</p>
                      )}
                    </section>
                  )}

                  {/* Closed state */}
                  {modalPosting.status !== 'open' && (
                    <p className="text-on-surface-variant italic text-body-md border-t border-outline-variant pt-lg">
                      This position is no longer accepting applications.
                    </p>
                  )}

                  {/* Success state */}
                  {applied && (
                    <div className="bg-green-50 dark:bg-green-900/30 border border-mantis rounded-xl p-lg text-center">
                      <span className="material-symbols-outlined text-[40px] text-picture-book-green mb-sm block">check_circle</span>
                      <h3 className="text-headline-md font-bold text-picture-book-green mb-sm">Application received!</h3>
                      <p className="text-body-md text-on-surface">
                        Your CV has been submitted for{' '}
                        <strong>{modalPosting.position_title}</strong> at{' '}
                        <strong>{modalPosting.company_name}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fixed footer */}
            {modalPosting && modalPosting.status === 'open' && !applied && (
              <div className="flex-shrink-0 border-t border-outline-variant rounded-b-xl px-lg py-md flex items-center justify-end gap-md">
                <button
                  onClick={closeModal}
                  className="px-lg py-sm border border-outline-variant rounded-xl text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!file || applying}
                  className="flex items-center justify-center gap-sm bg-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-bold text-label-sm py-sm px-xl rounded-xl transition-all duration-200 active:scale-95"
                >
                  {applying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Sending...
                    </>
                  ) : 'Submit Application'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
