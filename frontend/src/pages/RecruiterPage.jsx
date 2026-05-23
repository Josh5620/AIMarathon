import React, { useState, useEffect, useCallback } from 'react'
import { searchCandidates, getCandidate } from '../api'
import './RecruiterPage.css'

const SORT_OPTIONS = [
  { value: 'score-desc', label: 'Best match first' },
  { value: 'score-asc', label: 'Lowest match first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'keywords-desc', label: 'Most keywords' },
]

const SENIORITY_OPTIONS = ['junior', 'mid', 'senior', 'lead', 'principal']

function sortResults(results, sortBy) {
  const sorted = [...results]
  switch (sortBy) {
    case 'score-asc':
      return sorted.sort((a, b) => b.distance - a.distance)
    case 'name-asc':
      return sorted.sort((a, b) =>
        (a.name || 'ZZZ').localeCompare(b.name || 'ZZZ')
      )
    case 'name-desc':
      return sorted.sort((a, b) =>
        (b.name || '').localeCompare(a.name || '')
      )
    case 'keywords-desc':
      return sorted.sort(
        (a, b) => b.overlap_keywords.length - a.overlap_keywords.length
      )
    case 'score-desc':
    default:
      return sorted.sort((a, b) => a.distance - b.distance)
  }
}

export default function RecruiterPage() {
  const [jobDescription, setJobDescription] = useState('')
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [selectedKeywords, setSelectedKeywords] = useState([])
  const [sortBy, setSortBy] = useState('score-desc')
  const [showCount, setShowCount] = useState(5)

  // Filter panel state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minYoe, setMinYoe] = useState('')
  const [selectedSeniority, setSelectedSeniority] = useState([])
  const [locationFilter, setLocationFilter] = useState('')
  const [certInput, setCertInput] = useState('')
  const [requiredCerts, setRequiredCerts] = useState([])
  const [langInput, setLangInput] = useState('')
  const [requiredLangs, setRequiredLangs] = useState([])

  // Candidate detail modal state
  const [modalId, setModalId] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const closeModal = useCallback(() => {
    setModalId(null)
    setModalData(null)
    setModalError('')
  }, [])

  const handleViewProfile = useCallback(async (id) => {
    setModalId(id)
    setModalData(null)
    setModalError('')
    setModalLoading(true)
    try {
      const data = await getCandidate(id)
      setModalData(data)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!modalId) return
    function onKey(e) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalId, closeModal])

  const activeFilterCount = [
    minYoe !== '',
    selectedSeniority.length > 0,
    locationFilter.trim() !== '',
    requiredCerts.length > 0,
    requiredLangs.length > 0,
  ].filter(Boolean).length

  function clearAllFilters() {
    setMinYoe('')
    setSelectedSeniority([])
    setLocationFilter('')
    setCertInput('')
    setRequiredCerts([])
    setLangInput('')
    setRequiredLangs([])
  }

  function toggleSeniority(s) {
    setSelectedSeniority((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function addTag(value, list, setList, setInput) {
    const v = value.trim().toLowerCase()
    if (v && !list.includes(v)) setList((prev) => [...prev, v])
    setInput('')
  }

  function removeTag(value, setList) {
    setList((prev) => prev.filter((x) => x !== value))
  }

  function handleTagKeyDown(e, value, list, setList, setInput) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(value, list, setList, setInput)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!jobDescription.trim()) return
    setStatus('loading')
    setError('')
    setResults([])
    setSelectedKeywords([])
    setSortBy('score-desc')
    setShowCount(5)

    const filters = {}
    if (minYoe !== '')              filters.min_years_experience = parseFloat(minYoe)
    if (selectedSeniority.length)  filters.seniority_in = selectedSeniority
    if (requiredCerts.length)      filters.required_certifications = requiredCerts
    if (requiredLangs.length)      filters.required_languages = requiredLangs
    if (locationFilter.trim())     filters.location_contains = locationFilter.trim()

    try {
      const data = await searchCandidates(jobDescription, filters)
      setResults(data.results)
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function toggleKeyword(kw) {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    )
  }

  function clearKeywordFilters() {
    setSelectedKeywords([])
  }

  const allKeywords = [...new Set(results.flatMap((r) => r.overlap_keywords))].sort()

  const filteredResults =
    selectedKeywords.length === 0
      ? results
      : results.filter((r) =>
          selectedKeywords.every((kw) => r.overlap_keywords.includes(kw))
        )

  const sortedResults = sortResults(filteredResults, sortBy)
  const displayResults = sortedResults.slice(0, showCount)
  const hasMore = sortedResults.length > showCount
  const charCount = jobDescription.length

  return (
    <div className="recruiter-page">
      <h1>Find Candidates</h1>
      <p className="page-subtitle">
        Paste a job description to find the best matching candidates from the database.
      </p>

      {/* ── Search form ─────────────────────────── */}
      <form onSubmit={handleSearch}>
        <label htmlFor="jd-input" className="form-label">
          Job Description
        </label>
        <textarea
          id="jd-input"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          aria-describedby="jd-hint"
        />
        <div className="form-footer">
          <span id="jd-hint" className="char-count">
            {charCount > 0 ? `${charCount} characters` : ''}
          </span>
          <button
            type="submit"
            disabled={!jobDescription.trim() || status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Searching...' : 'Search Candidates'}
          </button>
        </div>
      </form>

      {/* ── Filter panel ────────────────────────── */}
      <div className="filter-panel">
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          <span>{filtersOpen ? '▲' : '▼'} Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount} active</span>
          )}
        </button>

        {filtersOpen && (
          <div className="filter-body">
            {/* Min YoE */}
            <div className="filter-row">
              <label className="filter-field-label" htmlFor="min-yoe">
                Min. Years of Experience
              </label>
              <input
                id="min-yoe"
                type="number"
                min="0"
                max="40"
                step="0.5"
                placeholder="e.g. 3"
                value={minYoe}
                onChange={(e) => setMinYoe(e.target.value)}
                className="filter-input filter-input-sm"
              />
            </div>

            {/* Seniority */}
            <div className="filter-row">
              <span className="filter-field-label">Seniority</span>
              <div className="seniority-chips">
                {SENIORITY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`filter-chip ${selectedSeniority.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleSeniority(s)}
                    aria-pressed={selectedSeniority.includes(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="filter-row">
              <label className="filter-field-label" htmlFor="location-filter">
                Location (contains)
              </label>
              <input
                id="location-filter"
                type="text"
                placeholder="e.g. Berlin, Germany"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Certifications */}
            <div className="filter-row">
              <label className="filter-field-label" htmlFor="cert-input">
                Required Certifications
              </label>
              <div className="tag-input-row">
                <input
                  id="cert-input"
                  type="text"
                  placeholder="Type cert name, press Enter"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleTagKeyDown(e, certInput, requiredCerts, setRequiredCerts, setCertInput)
                  }
                  className="filter-input"
                />
                <button
                  type="button"
                  className="tag-add-btn"
                  onClick={() =>
                    addTag(certInput, requiredCerts, setRequiredCerts, setCertInput)
                  }
                  disabled={!certInput.trim()}
                >
                  Add
                </button>
              </div>
              {requiredCerts.length > 0 && (
                <div className="tag-list">
                  {requiredCerts.map((c) => (
                    <span key={c} className="tag">
                      {c}
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => removeTag(c, setRequiredCerts)}
                        aria-label={`Remove ${c}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Languages */}
            <div className="filter-row">
              <label className="filter-field-label" htmlFor="lang-input">
                Spoken Languages
              </label>
              <div className="tag-input-row">
                <input
                  id="lang-input"
                  type="text"
                  placeholder="Type language, press Enter"
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleTagKeyDown(e, langInput, requiredLangs, setRequiredLangs, setLangInput)
                  }
                  className="filter-input"
                />
                <button
                  type="button"
                  className="tag-add-btn"
                  onClick={() =>
                    addTag(langInput, requiredLangs, setRequiredLangs, setLangInput)
                  }
                  disabled={!langInput.trim()}
                >
                  Add
                </button>
              </div>
              {requiredLangs.length > 0 && (
                <div className="tag-list">
                  {requiredLangs.map((l) => (
                    <span key={l} className="tag">
                      {l}
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => removeTag(l, setRequiredLangs)}
                        aria-label={`Remove ${l}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={clearAllFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Loading state ───────────────────────── */}
      {status === 'loading' && (
        <div className="loading-card" role="status" aria-live="polite">
          <div className="loading-steps">
            <div className="loading-step">
              <div className="spinner-sm" />
              <span>Embedding job description...</span>
            </div>
            <div className="loading-step">
              <div className="spinner-sm" />
              <span>Extracting keywords...</span>
            </div>
            <div className="loading-step">
              <div className="spinner-sm" />
              <span>Ranking candidates...</span>
            </div>
          </div>
          <p className="loading-hint">This usually takes 5-15 seconds</p>
        </div>
      )}

      {/* ── Error state ─────────────────────────── */}
      {status === 'error' && (
        <div className="error-card" role="alert">
          <strong>Search failed</strong>
          <p>{error}</p>
          <button className="retry-btn" onClick={handleSearch}>
            Retry
          </button>
        </div>
      )}

      {/* ── Empty results ───────────────────────── */}
      {status === 'done' && results.length === 0 && (
        <div className="empty-card">
          <p className="no-results">No matching candidates found</p>
          <p className="empty-hint">
            Try a broader job description or upload more resumes first.
          </p>
        </div>
      )}

      {/* ── Toolbar: keyword filter + sort ─────── */}
      {status === 'done' && results.length > 0 && (
        <>
          <div className="toolbar">
            <div className="toolbar-left">
              <span className="results-count">
                {filteredResults.length} candidate{filteredResults.length !== 1 ? 's' : ''}
                {selectedKeywords.length > 0 && ` (filtered from ${results.length})`}
              </span>
            </div>
            <div className="toolbar-right">
              <label htmlFor="sort-select" className="sr-only">
                Sort results
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {allKeywords.length > 0 && (
            <div className="keyword-filters" role="group" aria-label="Filter by keyword">
              <span className="filter-label">Filter:</span>
              {allKeywords.map((kw) => (
                <button
                  key={kw}
                  className={`filter-chip ${selectedKeywords.includes(kw) ? 'active' : ''}`}
                  onClick={() => toggleKeyword(kw)}
                  aria-pressed={selectedKeywords.includes(kw)}
                >
                  {kw}
                </button>
              ))}
              {selectedKeywords.length > 0 && (
                <button className="clear-filters" onClick={clearKeywordFilters}>
                  Clear all
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Result cards ────────────────────────── */}
      {displayResults.map((r, i) => {
        const score = Math.round((1 - r.distance) * 100)
        return (
          <div key={r.id} className="result-card">
            <div className="card-rank">#{i + 1}</div>

            <div className="card-header">
              <h3>{r.name || 'Anonymous'}</h3>
              <span className="score" aria-label={`${score} percent match`}>
                {score}% match
              </span>
            </div>

            {/* Seniority + YoE + location meta row */}
            {(r.seniority || r.years_experience != null || r.location) && (
              <div className="card-meta">
                {r.seniority && (
                  <span className={`seniority-badge seniority-${r.seniority}`}>
                    {r.seniority}
                  </span>
                )}
                {r.years_experience != null && (
                  <span className="meta-item">{r.years_experience} yrs exp</span>
                )}
                {r.location && (
                  <span className="meta-item meta-location">{r.location}</span>
                )}
              </div>
            )}

            <div className="score-bar" aria-hidden="true">
              <div className="score-fill" style={{ width: `${score}%` }} />
            </div>

            {/* AI-generated candidate summary */}
            {r.summary && (
              <p className="card-summary">&#8220;{r.summary}&#8221;</p>
            )}

            {/* Matched keywords */}
            {r.overlap_keywords.length > 0 && (
              <div className="card-section">
                <span className="section-label">Matched:</span>
                <div className="chip-row">
                  {r.overlap_keywords.map((kw) => (
                    <span key={kw} className="chip chip-match">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills chips */}
            {r.skills?.length > 0 && (
              <div className="card-section">
                <span className="section-label">Skills:</span>
                <div className="chip-row">
                  {r.skills.slice(0, 8).map((s) => (
                    <span key={s} className="chip chip-skill">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <details className="explanation-details">
              <summary>Why this candidate?</summary>
              <p className="explanation">{r.explanation}</p>
            </details>

            <div className="card-actions">
              <button
                className="view-profile-btn"
                onClick={() => handleViewProfile(r.id)}
              >
                View Full Profile →
              </button>
            </div>
          </div>
        )
      })}

      {/* ── Show more ───────────────────────────── */}
      {hasMore && (
        <button
          className="show-more-btn"
          onClick={() => setShowCount((c) => c + 5)}
        >
          Show more ({sortedResults.length - showCount} remaining)
        </button>
      )}

      {/* ── Candidate detail modal ───────────────── */}
      {modalId && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal} aria-label="Close profile">
              ×
            </button>

            {modalLoading && (
              <div className="modal-loading">
                <div className="spinner-sm" />
                <span>Loading profile...</span>
              </div>
            )}

            {modalError && (
              <p className="modal-error">{modalError}</p>
            )}

            {modalData && (
              <>
                <div className="modal-header">
                  <h2 id="modal-title">{modalData.name || 'Anonymous'}</h2>
                  {modalData.email && (
                    <a href={`mailto:${modalData.email}`} className="modal-email">
                      {modalData.email}
                    </a>
                  )}
                  <div className="modal-meta">
                    {modalData.seniority && (
                      <span className={`seniority-badge seniority-${modalData.seniority}`}>
                        {modalData.seniority}
                      </span>
                    )}
                    {modalData.years_experience != null && (
                      <span className="meta-item">{modalData.years_experience} yrs exp</span>
                    )}
                    {modalData.location && (
                      <span className="meta-item meta-location">{modalData.location}</span>
                    )}
                  </div>
                </div>

                {modalData.profile?.summary && (
                  <p className="modal-summary">{modalData.profile.summary}</p>
                )}

                {(modalData.profile?.links?.github ||
                  modalData.profile?.links?.linkedin ||
                  modalData.profile?.links?.portfolio ||
                  modalData.file_url) && (
                  <div className="modal-links">
                    {modalData.profile?.links?.github && (
                      <a href={modalData.profile.links.github} target="_blank" rel="noopener noreferrer" className="modal-link-btn">
                        GitHub
                      </a>
                    )}
                    {modalData.profile?.links?.linkedin && (
                      <a href={modalData.profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="modal-link-btn">
                        LinkedIn
                      </a>
                    )}
                    {modalData.profile?.links?.portfolio && (
                      <a href={modalData.profile.links.portfolio} target="_blank" rel="noopener noreferrer" className="modal-link-btn">
                        Portfolio
                      </a>
                    )}
                    {modalData.file_url && (
                      <a href={modalData.file_url} target="_blank" rel="noopener noreferrer" className="modal-link-btn modal-link-download">
                        Download Resume
                      </a>
                    )}
                  </div>
                )}

                {modalData.profile?.education?.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">Education</h4>
                    {modalData.profile.education.map((edu, i) => (
                      <div key={i} className="edu-entry">
                        <span className="edu-degree">
                          {[edu.degree, edu.field ? `in ${edu.field}` : null].filter(Boolean).join(' ')}
                        </span>
                        {edu.institution && (
                          <span className="edu-institution">{edu.institution}</span>
                        )}
                        {edu.year && <span className="edu-year">{edu.year}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {modalData.certifications?.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">Certifications</h4>
                    <div className="chip-row">
                      {modalData.certifications.map((c) => (
                        <span key={c} className="chip chip-skill">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {modalData.languages?.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">Spoken Languages</h4>
                    <div className="chip-row">
                      {modalData.languages.map((l) => (
                        <span key={l} className="chip chip-match">{l}</span>
                      ))}
                    </div>
                  </div>
                )}

                {modalData.profile?.work_authorization && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">Work Authorization</h4>
                    <p className="modal-text">{modalData.profile.work_authorization}</p>
                  </div>
                )}

                <details className="modal-resume-details">
                  <summary>Full Resume Text</summary>
                  <pre className="modal-resume-text">{modalData.full_text}</pre>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
