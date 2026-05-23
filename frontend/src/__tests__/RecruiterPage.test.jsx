import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RecruiterPage from '../pages/RecruiterPage'

vi.mock('../api', () => ({
  searchCandidates: vi.fn(),
}))

import { searchCandidates } from '../api'

const MOCK_RESULTS = {
  results: [
    {
      id: '1',
      name: 'Alice',
      distance: 0.15,
      overlap_keywords: ['python', 'react'],
      explanation: 'Strong match because of Python expertise.',
    },
    {
      id: '2',
      name: null,
      distance: 0.4,
      overlap_keywords: ['java'],
      explanation: 'Decent Java background.',
    },
    {
      id: '3',
      name: 'Charlie',
      distance: 0.25,
      overlap_keywords: ['python', 'docker'],
      explanation: 'Great DevOps skills.',
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RecruiterPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  searchCandidates.mockReset()
})

describe('RecruiterPage', () => {
  it('sends the job description to the backend when searching', async () => {
    searchCandidates.mockResolvedValueOnce({ results: [] })
    const user = userEvent.setup()

    renderPage()

    const textarea = screen.getByPlaceholderText(/paste the job description/i)
    const button = screen.getByRole('button', { name: /search/i })

    await user.type(textarea, 'Looking for a senior Python engineer')
    await user.click(button)

    expect(searchCandidates).toHaveBeenCalledTimes(1)
    // First arg is the job description; second is the filters object (may be empty)
    expect(searchCandidates.mock.calls[0][0]).toBe('Looking for a senior Python engineer')
  })

  it('displays candidate results from the backend', async () => {
    searchCandidates.mockResolvedValueOnce(MOCK_RESULTS)
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/paste the job description/i), 'Python dev')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Name renders (or "Anonymous" for null)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()

    // Match scores render correctly
    expect(screen.getByText('85% match')).toBeInTheDocument()
    expect(screen.getByText('60% match')).toBeInTheDocument()
    expect(screen.getByText('75% match')).toBeInTheDocument()

    // Keyword chips render (python appears on multiple cards)
    const cards = screen.getAllByText(/% match/)
    expect(cards).toHaveLength(3)

    // Explanations render (inside <details>)
    const details = document.querySelectorAll('.explanation-details')
    expect(details.length).toBe(3)
  })

  it('shows "No matching candidates found" when results are empty', async () => {
    searchCandidates.mockResolvedValueOnce({ results: [] })
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/paste the job description/i), 'Some role')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText(/no matching candidates found/i)).toBeInTheDocument()
    })
  })

  it('shows loading message while searching', async () => {
    let resolveSearch
    searchCandidates.mockReturnValueOnce(
      new Promise((resolve) => { resolveSearch = resolve })
    )
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/paste the job description/i), 'test')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(screen.getByText(/5-15 seconds/i)).toBeInTheDocument()

    resolveSearch({ results: [] })
    await waitFor(() => {
      expect(screen.queryByText(/5-15 seconds/i)).not.toBeInTheDocument()
    })
  })

  it('filters results by selected keyword', async () => {
    searchCandidates.mockResolvedValueOnce(MOCK_RESULTS)
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/paste the job description/i), 'dev')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Click "java" filter chip — only candidate #2 has java
    const javaFilter = screen.getByRole('button', { name: 'java' })
    await user.click(javaFilter)

    // Only the java candidate should remain
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument()
  })

  it('sorts results by name', async () => {
    searchCandidates.mockResolvedValueOnce(MOCK_RESULTS)
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/paste the job description/i), 'dev')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Sort by name A-Z
    const sortSelect = screen.getByRole('combobox')
    await user.selectOptions(sortSelect, 'name-asc')

    const cards = screen.getAllByRole('heading', { level: 3 })
    expect(cards[0]).toHaveTextContent('Alice')
    expect(cards[1]).toHaveTextContent('Charlie')
  })
})
