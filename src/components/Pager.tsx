import React, { useState } from 'react';
import Icon from './Icon';

/** Paginación en cliente. Si la lista cambia de tamaño, la página se ajusta sola. */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  return { pageItems, page: current, setPage, totalPages, total: items.length, pageSize };
}

interface PagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export const Pager: React.FC<PagerProps> = ({ page, totalPages, total, pageSize, onChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pager">
      <span className="pager-info">{from}–{to} de {total}</span>
      <div className="pager-controls">
        <button className="pager-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="pager-page">{page} / {totalPages}</span>
        <button className="pager-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
};
