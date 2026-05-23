const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function connectionError() {
  return new Error(
    'Unable to reach the server. Please check your connection and try again.'
  )
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    if (!res.ok) return false
    return true
  } catch {
    return false
  }
}

export async function uploadResume(file) {
  const form = new FormData()
  form.append('file', file)

  let res
  try {
    res = await fetch(`${API_BASE}/api/candidates/upload`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw connectionError()
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Upload failed (${res.status})`)
  }

  return res.json()
}

export async function searchCandidates(jobDescription, filters = {}) {
  const body = { jobDescription }

  // Only include filter fields that are actually set — omitting keeps the backend behaving as before
  if (filters.min_years_experience != null) body.min_years_experience = filters.min_years_experience
  if (filters.seniority_in?.length)         body.seniority_in = filters.seniority_in
  if (filters.required_certifications?.length) body.required_certifications = filters.required_certifications
  if (filters.required_languages?.length)   body.required_languages = filters.required_languages
  if (filters.location_contains?.trim())    body.location_contains = filters.location_contains.trim()

  let res
  try {
    res = await fetch(`${API_BASE}/api/recruiter/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw connectionError()
  }

  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  return res.json()
}

export async function getCandidate(id) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/candidates/${id}`)
  } catch {
    throw connectionError()
  }
  if (!res.ok) throw new Error(`Not found (${res.status})`)
  return res.json()
}
