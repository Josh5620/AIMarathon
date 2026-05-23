import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { uploadResume, searchCandidates, getCandidate, checkHealth } = await import('../api.js')

beforeEach(() => {
  mockFetch.mockReset()
})

describe('checkHealth', () => {
  it('returns true when backend is reachable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    expect(await checkHealth()).toBe(true)
  })

  it('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await checkHealth()).toBe(false)
  })
})

describe('uploadResume', () => {
  it('calls POST /api/candidates/upload with FormData containing the file', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'abc-123', message: 'uploaded' }),
    })

    const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' })
    const result = await uploadResume(file)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/candidates/upload')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBe(file)
    expect(result).toEqual({ id: 'abc-123', message: 'uploaded' })
  })

  it('throws with backend detail message on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: 'Could not extract enough text' }),
    })

    const file = new File(['x'], 'bad.pdf')
    await expect(uploadResume(file)).rejects.toThrow('Could not extract enough text')
  })

  it('throws connection error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const file = new File(['x'], 'test.pdf')
    await expect(uploadResume(file)).rejects.toThrow(/unable to reach/i)
  })
})

describe('searchCandidates', () => {
  it('calls POST /api/recruiter/search with the job description as JSON', async () => {
    const mockResults = { results: [{ id: '1', name: 'Alice', distance: 0.2, overlap_keywords: ['python'], explanation: 'Good.' }] }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    })

    const result = await searchCandidates('Looking for a Python dev')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/recruiter/search')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(options.body)
    expect(body).toEqual({ jobDescription: 'Looking for a Python dev' })
    expect(result).toEqual(mockResults)
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(searchCandidates('test')).rejects.toThrow('Search failed (500)')
  })

  it('throws connection error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(searchCandidates('test')).rejects.toThrow(/unable to reach/i)
  })
})

describe('getCandidate', () => {
  it('calls GET /api/candidates/{id}', async () => {
    const mockCandidate = { id: 'xyz', name: 'Bob', email: 'bob@test.com' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCandidate),
    })

    const result = await getCandidate('xyz')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/candidates/xyz')
    expect(result).toEqual(mockCandidate)
  })
})
