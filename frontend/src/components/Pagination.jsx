export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 24 }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{ ...btnBase, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
      >
        ‹ Prev
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} style={btnBase}>1</button>
          {start > 2 && <span style={{ padding: '0 4px', color: '#9e9892' }}>…</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            ...btnBase,
            background: p === page ? '#000080' : '#fff',
            color: p === page ? '#fff' : '#3B3430',
            borderColor: p === page ? '#000080' : '#c4bfba',
            fontWeight: p === page ? 700 : 400,
          }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ padding: '0 4px', color: '#9e9892' }}>…</span>}
          <button onClick={() => onChange(totalPages)} style={btnBase}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{ ...btnBase, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}
      >
        Next ›
      </button>
    </div>
  )
}

const btnBase = {
  padding: '5px 11px',
  fontSize: '0.85rem',
  border: '1px solid #c4bfba',
  borderRadius: 6,
  background: '#fff',
  color: '#3B3430',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
