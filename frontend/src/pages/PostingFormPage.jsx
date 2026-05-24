import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createPosting, getRecruiter } from '../api'

export default function PostingFormPage() {
  const navigate = useNavigate()
  const { email } = useAuth()

  const [form, setForm] = useState({
    company_name: '',
    position_title: '',
    description: '',
    requirements: '',
  })

  useEffect(() => {
    if (!email) return
    getRecruiter(email).then(p => {
      if (p?.organization) setForm(f => ({ ...f, company_name: p.organization }))
    }).catch(() => {})
  }, [email])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company_name.trim() || !form.position_title.trim() || !form.description.trim()) {
      setError('Company name, job title, and description are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const posting = await createPosting({
        recruiter_email: email,
        company_name: form.company_name.trim(),
        position_title: form.position_title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim() || undefined,
      })
      navigate(`/recruiter/postings/${posting.id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="p-page-margin max-w-3xl">
      {/* Header */}
      <header className="mb-xl">
        <button
          onClick={() => navigate('/recruiter')}
          className="flex items-center gap-xs text-label-sm text-on-surface-variant hover:text-primary transition-colors mb-md"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to postings
        </button>
        <h1 className="text-page-title font-bold text-primary mb-xs">Create New Posting</h1>
        <p className="text-body-md text-on-surface-variant">
          The job description will be processed by AI to extract keywords and generate a searchable embedding.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-sm bg-red-50 border border-red-200 rounded-xl px-md py-sm mb-gutter text-error text-label-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-gutter">
        {/* Two-column row: Company + Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Company Name" required>
            <input
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              required
              className="form-input"
            />
          </Field>

          <Field label="Job Title / Position" required>
            <input
              name="position_title"
              value={form.position_title}
              onChange={handleChange}
              placeholder="e.g. Senior Backend Engineer"
              required
              className="form-input"
            />
          </Field>
        </div>

        {/* ToDo: Location and Job Type fields — not in backend schema, values not submitted */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Location" hint="Visual only — not yet saved to backend">
            <input
              name="location"
              placeholder="e.g. London / Remote"
              className="form-input opacity-60"
              disabled
            />
          </Field>

          <Field label="Job Type" hint="Visual only — not yet saved to backend">
            <select className="form-input opacity-60" disabled>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Remote</option>
            </select>
          </Field>
        </div>

        <Field label="Job Description" required hint="Paste the full job description — the more detail, the better the AI matching.">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, team, and what success looks like…"
            rows={8}
            required
            className="form-input resize-y"
          />
        </Field>

        <Field label="Requirements" hint="Optional. Skills, qualifications, experience — separate from the main description.">
          <textarea
            name="requirements"
            value={form.requirements}
            onChange={handleChange}
            placeholder="e.g. 5+ years Python, experience with distributed systems…"
            rows={5}
            className="form-input resize-y"
          />
        </Field>

        <div className="flex gap-md justify-end pt-sm">
          <button
            type="button"
            onClick={() => navigate('/recruiter')}
            disabled={submitting}
            className="px-lg py-sm border border-outline-variant rounded-xl text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-sm bg-primary hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-on-primary font-bold text-label-sm px-xl py-sm rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                Posting…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">publish</span>
                Publish Posting
              </>
            )}
          </button>
        </div>
      </form>

      <footer className="mt-xl py-lg text-center text-meta text-on-surface-variant opacity-40">
        HireLite · AI-powered recruiting
      </footer>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-xs group">
      <label className="text-label-sm font-semibold text-on-surface">
        {label}
        {required && <span className="text-error ml-xs">*</span>}
      </label>
      {hint && <p className="text-meta text-on-surface-variant">{hint}</p>}
      <div className="transition-transform duration-150 group-focus-within:scale-[1.01]">
        {children}
      </div>
    </div>
  )
}
