import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react'
import EmptyState from './EmptyState'

const buildPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const result = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('…')
    result.push(page)
  })
  return result
}

const DataTable = ({
  columns = [],
  rows = [],
  pageSize = 6,
  rowKey = 'id',
  emptyTitle = 'Aucun résultat',
  emptyText = 'Aucun élément ne correspond aux critères sélectionnés.',
  emptyAction = null,
  emptyIcon,
  pagination = true,
  footer = null,
  onRowClick = null,
  minWidth = '720px',
  className = '',
}) => {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [rows.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const currentRows = useMemo(() => {
    if (!pagination) return rows
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, pagination, rows])

  if (!rows.length) {
    return (
      <div className={`table-card ${className}`.trim()}>
        <EmptyState
          icon={emptyIcon || <PackageSearch size={22} />}
          title={emptyTitle}
          text={emptyText}
          action={emptyAction}
        />
      </div>
    )
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, rows.length)
  const pages = buildPages(page, totalPages)

  return (
    <div className={`table-card ${className}`.trim()}>
      <div className="table-scroll">
        <table className="data-table" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.align ? `text-${column.align}` : undefined}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row) => (
              <tr
                key={row[rowKey]}
                className={onRowClick ? 'is-clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${column.align ? `text-${column.align}` : ''} ${column.cellClassName || ''}`.trim()}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="table-summary">{footer}</div>}
      {pagination && rows.length > pageSize && (
        <div className="pagination">
          <span className="pagination__info">
            <strong>
              {start}–{end}
            </strong>{' '}
            sur <strong>{rows.length}</strong> éléments
          </span>
          <div className="pagination__pages">
            <button
              type="button"
              className="pagination__btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              aria-label="Page précédente"
            >
              <ChevronLeft size={13} />
            </button>
            {pages.map((item, index) =>
              item === '…' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="pagination__btn"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={`pagination__btn ${item === page ? 'is-active' : ''}`}
                  onClick={() => setPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              className="pagination__btn"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
