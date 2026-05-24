import React from 'react' // eslint-disable-line no-unused-vars
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RecruiterPage from '../pages/RecruiterPage'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ email: 'recruiter@test.com' }),
}))

vi.mock('../api', () => ({
  listMyPostings: vi.fn(),
  deletePosting: vi.fn(),
  getMyPostingStats: vi.fn(),
}))

vi.mock('../components/Pagination', () => ({
  default: () => null,
}))

const OPEN_POSTING = {
  id: 'p1',
  position_title: 'Senior Engineer',
  company_name: 'Acme Corp',
  status: 'open',
  applicant_count: 5,
  created_at: '2024-01-01T00:00:00Z',
}

const CLOSED_POSTING = {
  id: 'p2',
  position_title: 'Product Designer',
  company_name: 'Beta Inc',
  status: 'closed',
  applicant_count: 2,
  created_at: '2024-02-01T00:00:00Z',
}

const MOCK_PAGE = {
  items: [OPEN_POSTING, CLOSED_POSTING],
  total: 2,
  page: 1,
  total_pages: 1,
}

import { listMyPostings, deletePosting, getMyPostingStats } from '../api'

function renderPage() {
  return render(
    <MemoryRouter>
      <RecruiterPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  listMyPostings.mockReset()
  deletePosting.mockReset()
  getMyPostingStats.mockReset()
  getMyPostingStats.mockResolvedValue({
    recruiter_email: 'recruiter@test.com',
    total_open_postings: 1,
    total_open_posting_applicants: 5,
  })
})

describe('RecruiterPage', () => {
  it('renders posting titles after load', async () => {
    listMyPostings.mockResolvedValueOnce(MOCK_PAGE)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
    })

    expect(screen.getByText('Product Designer')).toBeInTheDocument()
  })

  it('shows open/closed status badges', async () => {
    listMyPostings.mockResolvedValueOnce(MOCK_PAGE)
    renderPage()

    await waitFor(() => screen.getByText('Senior Engineer'))

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows applicant counts', async () => {
    listMyPostings.mockResolvedValueOnce(MOCK_PAGE)
    renderPage()

    await waitFor(() => screen.getByText('Senior Engineer'))

    expect(screen.getByText('5 applicants')).toBeInTheDocument()
    expect(screen.getByText('2 applicants')).toBeInTheDocument()
  })

  it('shows empty state when no postings', async () => {
    listMyPostings.mockResolvedValueOnce({ items: [], total: 0, page: 1, total_pages: 0 })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/haven't posted any roles/i)).toBeInTheDocument()
    })
  })

  it('calls deletePosting on confirm', async () => {
    listMyPostings.mockResolvedValue(MOCK_PAGE)
    deletePosting.mockResolvedValueOnce({})
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const user = userEvent.setup()

    renderPage()

    await waitFor(() => screen.getByText('Senior Engineer'))

    const deleteButtons = screen.getAllByTitle('Delete posting')
    await user.click(deleteButtons[0])

    expect(deletePosting).toHaveBeenCalledWith('p1')
  })

  it('does not delete when confirm is cancelled', async () => {
    listMyPostings.mockResolvedValue(MOCK_PAGE)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    const user = userEvent.setup()

    renderPage()

    await waitFor(() => screen.getByText('Senior Engineer'))

    const deleteButtons = screen.getAllByTitle('Delete posting')
    await user.click(deleteButtons[0])

    expect(deletePosting).not.toHaveBeenCalled()
  })
})
