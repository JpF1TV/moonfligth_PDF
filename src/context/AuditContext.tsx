import React, { createContext, useContext, ReactNode } from 'react';
import { usePersistedState } from '../utils/usePersistedState';

export type AuditModule =
  | 'almacen'
  | 'solicitudes'
  | 'oma'
  | 'operaciones'
  | 'ingenieria'
  | 'mantenimiento'
  | 'usuarios'
  | 'sistema';

export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'status' | 'other';

export interface AuditEntry {
  id: string;
  date: string;          // ISO
  module: AuditModule;
  action: AuditAction;
  description: string;   // texto legible de lo que pasó
  user: string;
  reference?: string;    // id/numero relacionado (OT, ticket, solicitud, etc.)
}

interface AuditContextType {
  audit: AuditEntry[];
  logAudit: (entry: Omit<AuditEntry, 'id' | 'date'>) => void;
  clearAudit: () => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [audit, setAudit] = usePersistedState<AuditEntry[]>('audit', []);

  const logAudit = (entry: Omit<AuditEntry, 'id' | 'date'>) => {
    setAudit(prev => [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString() },
      ...prev,
    ]);
  };

  const clearAudit = () => setAudit([]);

  return (
    <AuditContext.Provider value={{ audit, logAudit, clearAudit }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
};

/** Etiquetas legibles para la UI. */
export const AUDIT_MODULE_LABEL: Record<AuditModule, string> = {
  almacen: 'Almacén',
  solicitudes: 'Solicitudes',
  oma: 'OMA',
  operaciones: 'Operaciones',
  ingenieria: 'Ingeniería',
  mantenimiento: 'Mantenimiento',
  usuarios: 'Usuarios',
  sistema: 'Sistema',
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Creación',
  update: 'Edición',
  delete: 'Eliminación',
  approve: 'Aprobación',
  reject: 'Rechazo',
  status: 'Cambio de estado',
  other: 'Otro',
};
