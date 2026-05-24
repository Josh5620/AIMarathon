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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/recruiter')} style={backBtnStyle}>← Back to postings</button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '20px 0 4px' }}>Create New Job Posting</h1>
      <p style={{ color: '#6e665f', marginBottom: 28, fontSize: '0.875rem' }}>
        The job description will be processed by AI to extract keywords and generate a searchable embedding.
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #f5c6c6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Company Name" required>
          <input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="e.g. Acme Corp"
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Job Title / Position" required>
          <input
            name="position_title"
            value={form.position_title}
            onChange={handleChange}
            placeholder="e.g. Senior Backend Engineer"
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Job Description" required hint="Paste the full job description here — the more detail, the better the AI matching.">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, team, and what success looks like…"
            rows={8}
            required
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <Field label="Requirements" hint="Separate from the main description (optional). Skills, qualifications, experience.">
          <textarea
            name="requirements"
            value={form.requirements}
            onChange={handleChange}
            placeholder="e.g. 5+ years Python, experience with distributed systems, excellent communication…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/recruiter')}
            disabled={submitting}
            style={cancelBtnStyle}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 28px', fontWeight: 700, fontSize: '0.95rem',
              border: 'none', borderRadius: 8,
              background: submitting ? '#aaa' : '#000080',
              color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Publishing…' : 'Publish Posting'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3B3430' }}>
        {label}{required && <span style={{ color: '#c0392b', marginLeft: 2 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: '0.78rem', color: '#9e9892', margin: 0 }}>{hint}</p>}
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit',
  border: '1px solid #c4bfba', borderRadius: 8,
  background: '#faf9f8', color: '#1a1a1a',
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#000080', fontSize: '0.9rem', padding: 0, textDecoration: 'underline',
}

const cancelBtnStyle = {
  padding: '10px 20px', fontSize: '0.9rem', fontFamily: 'inherit',
  border: '1px solid #c4bfba', borderRadius: 8,
  background: 'transparent', color: '#6e665f', cursor: 'pointer',
}
