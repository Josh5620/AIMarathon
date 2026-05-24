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

export async function cancelMeeting(meetingId, providerToken) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: { 'X-Google-Access-Token': providerToken },
    })
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to cancel meeting (${res.status})`)
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

// ── Job Postings ──────────────────────────────────────────────────────────────

export async function createPosting(payload) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch { throw connectionError() }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to create posting (${res.status})`)
  }
  return res.json()
}

export async function listMyPostings(recruiterEmail, page = 1, limit = 10) {
  let res
  try {
    res = await fetch(
      `${API_BASE}/api/postings/mine?recruiter_email=${encodeURIComponent(recruiterEmail)}&page=${page}&limit=${limit}`
    )
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to load postings (${res.status})`)
  return res.json()
}

export async function listOpenPostings(page = 1, limit = 10) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/?page=${page}&limit=${limit}`)
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to load postings (${res.status})`)
  return res.json()
}

export async function getPosting(id) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/${id}`)
  } catch { throw connectionError() }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load posting (${res.status})`)
  return res.json()
}

export async function updatePosting(id, patch) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to update posting (${res.status})`)
  return res.json()
}

export async function deletePosting(id) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/${id}`, { method: 'DELETE' })
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to delete posting (${res.status})`)
}

export async function applyToPosting(postingId, file) {
  const form = new FormData()
  form.append('file', file)
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/${postingId}/apply`, {
      method: 'POST',
      body: form,
    })
  } catch { throw connectionError() }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Application failed (${res.status})`)
  }
  return res.json()
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function listApplications(postingId, page = 1, limit = 10) {
  let res
  try {
    res = await fetch(
      `${API_BASE}/api/postings/${postingId}/applications?page=${page}&limit=${limit}`
    )
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to load applications (${res.status})`)
  return res.json()
}

export async function getApplication(id) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/applications/${id}`)
  } catch { throw connectionError() }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load application (${res.status})`)
  return res.json()
}

export async function deleteApplication(id) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/applications/${id}`, { method: 'DELETE' })
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to remove applicant (${res.status})`)
}

export async function toggleInterested(id, isInterested) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/applications/${id}/interested`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_interested: isInterested }),
    })
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to update interest (${res.status})`)
  return res.json()
}

export async function getCrossFit(applicationId, topN = 5) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/applications/${applicationId}/cross-fit?top_n=${topN}`)
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to load cross-fit (${res.status})`)
  return res.json()
}

export async function sendSuggestionEmail(applicationId, payload, providerToken) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/applications/${applicationId}/send-suggestion-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Google-Access-Token': providerToken,
      },
      body: JSON.stringify(payload),
    })
  } catch { throw connectionError() }
  if (res.status === 401) throw new Error('REAUTH')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to send email (${res.status})`)
  }
  return res.json()
}

export async function getReport(postingId) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/postings/${postingId}/report`)
  } catch { throw connectionError() }
  if (!res.ok) throw new Error(`Failed to load report (${res.status})`)
  return res.json()
}
