import { useState, useEffect } from 'react'
import { updateRecruiter } from '../api'

const FIELDS = [
  { key: 'name',         label: 'Display Name',  type: 'text',     placeholder: 'Jane Smith' },
  { key: 'organization', label: 'Organization',   type: 'text',     placeholder: 'Acme Corp' },
  { key: 'job_title',    label: 'Job Title',      type: 'text',     placeholder: 'Senior Recruiter' },
  { key: 'phone',        label: 'Phone',          type: 'tel',      placeholder: '+1 555 123 4567' },
  { key: 'avatar_url',   label: 'Avatar URL',     type: 'url',      placeholder: 'https://...' },
  { key: 'bio',          label: 'Bio',            type: 'textarea', placeholder: 'Short bio visible to your team' },
]

export default function RecruiterProfileModal({ email, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', organization: '', job_title: '', bio: '', phone: '', avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        name:         profile.name         || '',
        organization: profile.organization || '',
        job_title:    profile.job_title    || '',
        bio:          profile.bio          || '',
        phone:        profile.phone        || '',
        avatar_url:   profile.avatar_url   || '',
      })
    }
  }, [profile])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const patch = {}
    for (const [k, v] of Object.entries(form)) {
      if (v.trim()) patch[k] = v.trim()
    }
    try {
      const updated = await updateRecruiter(email, patch)
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 id="profile-modal-title" style={{ marginBottom: 4 }}>Edit Profile</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: 20 }}>{email}</p>

        {error && <p className="modal-error" style={{ marginBottom: 16 }}>{error}</p>}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FIELDS.map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                htmlFor={`pf-${key}`}
                style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}
              >
                {label}
              </label>
              {type === 'textarea' ? (
                <textarea
                  id={`pf-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  style={{
                    padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)',
                    color: 'var(--text-h)', resize: 'vertical',
                  }}
                />
              ) : (
                <input
                  id={`pf-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    padding: '8px 10px', fontSize: '0.9rem', fontFamily: 'inherit',
                    border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px', fontSize: '0.9rem', fontFamily: 'inherit',
                border: '1px solid var(--border)', borderRadius: 6, background: 'transparent',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
                border: 'none', borderRadius: 6, background: 'var(--accent)',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
