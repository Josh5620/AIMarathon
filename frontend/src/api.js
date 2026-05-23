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

export async function searchCandidates(jobDescription) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/recruiter/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription }),
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
