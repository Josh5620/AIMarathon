import React, { useState } from 'react'
import { searchCandidates } from '../api'
import './RecruiterPage.css'

const SORT_OPTIONS = [
  { value: 'score-desc', label: 'Best match first' },
  { value: 'score-asc', label: 'Lowest match first' },
  { value: 'name-asc', label: 'Name A\u2013Z' },
  { value: 'name-desc', label: 'Name Z\u2013A' },
  { value: 'keywords-desc', label: 'Most keywords' },
]

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

  async function handleSearch(e) {
    e.preventDefault()
    if (!jobDescription.trim()) return
    setStatus('loading')
    setError('')
    setResults([])
    setSelectedKeywords([])
    setSortBy('score-desc')
    setShowCount(5)
    try {
      const data = await searchCandidates(jobDescription)
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

  function clearFilters() {
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

      {/* ── Toolbar: filters + sort ─────────────── */}
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
                <button className="clear-filters" onClick={clearFilters}>
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
            <div className="score-bar" aria-hidden="true">
              <div className="score-fill" style={{ width: `${score}%` }} />
            </div>
            <div className="keywords">
              {r.overlap_keywords.map((kw) => (
                <span key={kw} className="chip">
                  {kw}
                </span>
              ))}
            </div>
            <details className="explanation-details">
              <summary>Why this candidate?</summary>
              <p className="explanation">{r.explanation}</p>
            </details>
          </div>
        )
      })}

      {/* ── Show more button ────────────────────── */}
      {hasMore && (
        <button
          className="show-more-btn"
          onClick={() => setShowCount((c) => c + 5)}
        >
          Show more ({sortedResults.length - showCount} remaining)
        </button>
      )}
    </div>
  )
}
