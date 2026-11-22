import React, { useEffect, ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Panel más ancho para formularios largos. */
  wide?: boolean;
  children: ReactNode;
}

/** Panel lateral que entra por la derecha. Se cierra con Escape, con la X o al hacer clic fuera. */
const Drawer: React.FC<Props> = ({ open, title, onClose, wide, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className={`drawer ${wide ? 'drawer-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <h3>{title}</h3>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
};

export default Drawer;
