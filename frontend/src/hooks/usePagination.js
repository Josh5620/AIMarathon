import { useState, useEffect, useCallback } from 'react'

export default function usePagination(fetcher, limit = 10) {
  const [page, setPage]       = useState(1)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async (p) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher(p, limit)
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [fetcher, limit])

  useEffect(() => { load(page) }, [page, load]) // eslint-disable-line react-hooks/set-state-in-effect

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return { data, loading, error, page, totalPages, setPage, reload: () => load(page) }
}
