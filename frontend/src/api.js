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

export async function getRecruiter(email) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/recruiters/${encodeURIComponent(email)}`)
  } catch {
    throw connectionError()
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load recruiter profile (${res.status})`)
  return res.json()
}

export async function updateRecruiter(email, patch) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/recruiters/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch {
    throw connectionError()
  }
  if (!res.ok) throw new Error(`Failed to update profile (${res.status})`)
  return res.json()
}

export async function scheduleMeeting(providerToken, payload) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/meetings/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Google-Access-Token': providerToken,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw connectionError()
  }
  if (res.status === 401) throw new Error('REAUTH')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to schedule meeting (${res.status})`)
  }
  return res.json()
}

export async function getMeetings(recruiterEmail) {
  let res
  try {
    res = await fetch(
      `${API_BASE}/api/meetings?recruiter_email=${encodeURIComponent(recruiterEmail)}`
    )
  } catch {
    throw connectionError()
  }
  if (!res.ok) throw new Error(`Failed to load meetings (${res.status})`)
  return res.json()
}
