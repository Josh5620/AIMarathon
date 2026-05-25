export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const btnBase = 'px-3 py-1 text-label-sm border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface cursor-pointer font-[inherit]'

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={`${btnBase} ${page <= 1 ? 'opacity-40 cursor-default' : ''}`}
      >
        ‹ Prev
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} className={btnBase}>1</button>
          {start > 2 && <span className="px-1 text-on-surface-variant">…</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`${btnBase} ${
            p === page
              ? 'bg-primary text-on-primary border-primary font-bold'
              : ''
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-on-surface-variant">…</span>}
          <button onClick={() => onChange(totalPages)} className={btnBase}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={`${btnBase} ${page >= totalPages ? 'opacity-40 cursor-default' : ''}`}
      >
        Next ›
      </button>
    </div>
  )
}
