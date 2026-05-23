import React, { useState, useRef } from 'react'
import { uploadResume } from '../api'
import './CandidatePage.css'

const STEPS = [
  { label: 'Select file', key: 'select' },
  { label: 'Upload', key: 'upload' },
  { label: 'Done', key: 'done' },
]

function getStepIndex(status, file) {
  if (status === 'success') return 2
  if (status === 'uploading') return 1
  if (file) return 1
  return 0
}

export default function CandidatePage() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [resultId, setResultId] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const currentStep = getStepIndex(status, file)

  function handleFileChange(e) {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setStatus('idle')
      setError('')
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      setStatus('idle')
      setError('')
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setError('')
    try {
      const data = await uploadResume(file)
      setResultId(data.id)
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function handleReset() {
    setFile(null)
    setStatus('idle')
    setResultId('')
    setError('')
  }

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : null

  return (
    <div className="candidate-page">
      <h1>Upload Your Resume</h1>
      <p className="page-subtitle">Submit your resume to be matched with open positions.</p>

      {/* Step indicator */}
      <nav className="steps" aria-label="Upload progress">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className={`step ${i <= currentStep ? 'step-active' : ''} ${i < currentStep ? 'step-complete' : ''}`}
            aria-current={i === currentStep ? 'step' : undefined}
          >
            <span className="step-number">{i < currentStep ? '\u2713' : i + 1}</span>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </nav>

      {/* Step 1: File select */}
      {status !== 'success' && (
        <>
          <div
            className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Select a file to upload. Accepts PDF or DOCX."
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              hidden
              aria-hidden="true"
            />
            <div className="dropzone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="dropzone-title">Drag & drop your file here</p>
            <p className="dropzone-hint">or click to browse. Accepted: PDF, DOCX (max 10 MB)</p>
          </div>

          {file && (
            <div className="file-info">
              <div className="file-details">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{fileSizeMB} MB</span>
              </div>
              <button className="file-remove" onClick={handleReset} aria-label="Remove selected file">
                Remove
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          <button
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
            className="upload-btn"
            aria-busy={status === 'uploading'}
          >
            {status === 'uploading' ? 'Processing...' : 'Upload Resume'}
          </button>

          {status === 'uploading' && (
            <div className="upload-progress" role="status" aria-live="polite">
              <div className="spinner" />
              <p>Extracting text and analysing your resume...</p>
              <p className="progress-hint">This usually takes a few seconds.</p>
            </div>
          )}
        </>
      )}

      {/* Step 3: Result */}
      {status === 'success' && (
        <div className="success-card" role="status" aria-live="polite">
          <div className="success-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Resume uploaded successfully</h2>
          <p>Your resume has been processed and is now searchable by recruiters.</p>
          <div className="id-box">
            <span className="id-label">Candidate ID</span>
            <code>{resultId}</code>
          </div>
          <button className="upload-btn" onClick={handleReset}>Upload another resume</button>
        </div>
      )}

      {status === 'error' && (
        <div className="error-card" role="alert">
          <strong>Upload failed</strong>
          <p>{error}</p>
          <button className="retry-btn" onClick={handleUpload}>Retry</button>
        </div>
      )}
    </div>
  )
}
