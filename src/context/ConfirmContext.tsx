import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import Icon from '../components/Icon';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo rojo para acciones destructivas. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="confirm-overlay" onClick={() => close(false)}>
          <div className="confirm-box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${options.danger ? 'danger' : ''}`}>
              <Icon name={options.danger ? 'trash' : 'alert'} size={22} />
            </div>
            <h3>{options.title || (options.danger ? 'Confirmar eliminación' : 'Confirmar acción')}</h3>
            <p>{options.message}</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => close(false)}>
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button className={options.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)} autoFocus>
                {options.confirmLabel || (options.danger ? 'Eliminar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
