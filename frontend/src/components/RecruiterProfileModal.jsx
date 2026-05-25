import { useEffect, useState } from 'react'
import { updateRecruiter } from '../api'

const FIELDS = [
  { key: 'name', label: 'Display Name', type: 'text', placeholder: 'Jane Smith' },
  { key: 'organization', label: 'Organization', type: 'text', placeholder: 'Acme Corp' },
  { key: 'job_title', label: 'Job Title', type: 'text', placeholder: 'Senior Recruiter' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 555 123 4567' },
  { key: 'avatar_url', label: 'Avatar URL', type: 'url', placeholder: 'https://...' },
  { key: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Short bio visible to your team' },
]

export default function RecruiterProfileModal({ email, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    job_title: '',
    bio: '',
    phone: '',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name || '',
      organization: profile.organization || '',
      job_title: profile.job_title || '',
      bio: profile.bio || '',
      phone: profile.phone || '',
      avatar_url: profile.avatar_url || '',
    })
  }, [profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
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
      className="fixed inset-0 z-[90] flex items-center justify-center p-md bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-none bg-surface-container-lowest border border-outline-variant shadow-modal">
        <div className="sticky top-0 z-10 flex items-center justify-between px-lg py-md border-b border-outline-variant bg-surface-container-lowest">
          <div>
            <h2 id="profile-modal-title" className="text-headline-md font-bold text-on-surface">Profile</h2>
            <p className="text-meta text-on-surface-variant mt-xs">{email}</p>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-none hover:bg-surface-container text-on-surface-variant"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-lg space-y-md">
          {error && (
            <div className="rounded-none border border-red-200 bg-red-50 text-error text-label-sm px-md py-sm">
              {error}
            </div>
          )}

          {FIELDS.map(({ key, label, type, placeholder }) => (
            <div key={key} className="space-y-xs">
              <label htmlFor={`pf-${key}`} className="block text-label-sm font-semibold text-on-surface">
                {label}
              </label>
              {type === 'textarea' ? (
                <textarea
                  id={`pf-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full rounded-none border border-outline-variant bg-surface px-md py-sm text-body-md text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:border-primary"
                />
              ) : (
                <input
                  id={`pf-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-none border border-outline-variant bg-surface px-md py-sm text-body-md text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:border-primary"
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-end gap-sm pt-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-lg py-sm rounded-none border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-lg py-sm rounded-none bg-primary text-on-primary text-label-sm font-bold hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
