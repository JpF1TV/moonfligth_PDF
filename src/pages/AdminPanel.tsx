import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAudit } from '../context/AuditContext';
import ModuleIcon from '../components/ModuleIcon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';
import Icon from '../components/Icon';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

const AdminPanel: React.FC = () => {
  const { sessions } = useAuth();
  const { tickets, addTicket } = useTickets();
  const { requests, updateRequest, parts, updatePartItem, addHistory } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { logAudit } = useAudit();
  const [activeTab, setActiveTab] = useState<'sessions' | 'history' | 'approvals' | 'tickets'>('sessions');
  const [showTicketForm, setShowTicketForm] = useState(false);

  // Formatea una duración en minutos como "Xh Ym" o "Ym"
  const formatDuration = (mins: number) => {
    if (mins < 1) return '< 1 min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // Calcula duración de una sesión (usa logoutTime si existe, si no "ahora")
  const sessionDuration = (loginTime: string, logoutTime?: string) => {
    const end = logoutTime ? new Date(logoutTime).getTime() : Date.now();
    return Math.floor((end - new Date(loginTime).getTime()) / 60000);
  };

  const [ticketForm, setTicketForm] = useState({
    type: 'other' as 'user_block' | 'platform_failure' | 'request' | 'other',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });

  // Modal de resolución (aprobar/rechazar con observaciones)
  const [resolveModal, setResolveModal] = useState<{ requestId: string; action: 'approve' | 'reject' } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const activeSessions = sessions.filter(s => s.isActive);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const openTickets = tickets.filter(t => t.status !== 'closed');
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
  const sessionPg = usePagination(sortedSessions, 10);
  const approvalPg = usePagination(pendingRequests, 10);
  const ticketPg = usePagination(openTickets, 10);

  const openResolve = (requestId: string, action: 'approve' | 'reject') => {
    setResolveModal({ requestId, action });
    setResolveNotes('');
  };

  const closeResolve = () => {
    setResolveModal(null);
    setResolveNotes('');
  };

  // Ejecuta la aprobación con observaciones
  const confirmApprove = (requestId: string, approvalNotes: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    const part = parts.find(p => p.items.some(i => i.partNumber === request.partNumber));
    if (!part) { toast.error('No se encontró la pieza solicitada'); return; }
    const availableItems = part.items.filter(i => i.partNumber === request.partNumber && i.status === 'available');
    if (availableItems.length < request.quantity) {
      toast.error(`No hay suficientes piezas. Disponibles: ${availableItems.length}, Solicitadas: ${request.quantity}`);
      return;
    }
    if (request.requestType === 'exit') {
      for (let i = 0; i < request.quantity; i++) {
        updatePartItem(part.id, availableItems[i].id, { status: 'out' });
        addHistory({ partNumber: request.partNumber, serialNumber: availableItems[i].serialNumber, action: 'exit', quantity: 1, user: user?.username || '', date: new Date().toISOString(), notes: `Aprobado para ${request.requestedBy}${approvalNotes ? ` — ${approvalNotes}` : ''}` });
      }
    } else if (request.requestType === 'overhaul') {
      const item = availableItems[0];
      updatePartItem(part.id, item.id, { status: 'overhaul', overhaulInfo: { sentDate: new Date().toISOString().split('T')[0], expectedReturn: request.overhaulInfo?.expectedReturn, repairShop: request.overhaulInfo?.repairShop, reason: request.overhaulInfo?.reason, aircraftRemoved: request.overhaulInfo?.aircraftRemoved } });
      addHistory({ partNumber: request.partNumber, serialNumber: item.serialNumber, action: 'overhaul', quantity: 1, user: user?.username || '', date: new Date().toISOString(), notes: `Enviado a ${request.overhaulInfo?.repairShop}${approvalNotes ? ` — ${approvalNotes}` : ''}` });
    }
    updateRequest(requestId, {
      status: 'approved',
      approvedBy: user?.username,
      approvalDate: new Date().toISOString(),
      approvalNotes: approvalNotes || undefined,
    });
    logAudit({ module: 'solicitudes', action: 'approve', user: user?.username || '', description: `Aprobó solicitud de ${request.partNumber} (de ${request.requestedBy})${approvalNotes ? ` — ${approvalNotes}` : ''}`, reference: request.partNumber });
    toast.success('Solicitud aprobada');
  };

  // Ejecuta el rechazo con observaciones
  const confirmReject = (requestId: string, approvalNotes: string) => {
    const request = requests.find(r => r.id === requestId);
    updateRequest(requestId, {
      status: 'rejected',
      approvedBy: user?.username,
      approvalDate: new Date().toISOString(),
      approvalNotes: approvalNotes || undefined,
    });
    logAudit({ module: 'solicitudes', action: 'reject', user: user?.username || '', description: `Rechazó solicitud${request ? ` de ${request.partNumber} (de ${request.requestedBy})` : ''}${approvalNotes ? ` — ${approvalNotes}` : ''}`, reference: request?.partNumber });
    toast.info('Solicitud rechazada');
  };

  const handleResolveSubmit = () => {
    if (!resolveModal) return;
    if (resolveModal.action === 'approve') {
      confirmApprove(resolveModal.requestId, resolveNotes.trim());
    } else {
      confirmReject(resolveModal.requestId, resolveNotes.trim());
    }
    closeResolve();
  };

  const getAvailableCount = (partNumber: string) => {
    const part = parts.find(p => p.items.some(i => i.partNumber === partNumber));
    if (!part) return 0;
    return part.items.filter(i => i.partNumber === partNumber && i.status === 'available').length;
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    addTicket({ ...ticketForm, createdBy: user?.username || '', status: 'open' });
    setTicketForm({ type: 'other', title: '', description: '', priority: 'medium' });
    setShowTicketForm(false);
    toast.success('Ticket creado. Será atendido por el Super Administrador.');
  };

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title"><ModuleIcon name="admin" size={22} /> Panel Administrativo</h2></div>
      <div className="tabs">
        <button className={`tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>Usuarios Conectados ({activeSessions.length})</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial de Accesos ({sessions.length})</button>
        <button className={`tab ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>Aprobaciones ({pendingRequests.length})</button>
        <button className={`tab ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>Tickets ({openTickets.length})</button>
      </div>

      {activeTab === 'sessions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Usuario</th><th>Hora de Ingreso</th><th>Tiempo Conectado</th><th>Estado</th></tr></thead>
            <tbody>
              {activeSessions.map(session => (
                <tr key={session.id}>
                  <td><strong>{session.username}</strong></td>
                  <td>{new Date(session.loginTime).toLocaleString('es-CO')}</td>
                  <td>{formatDuration(sessionDuration(session.loginTime))}</td>
                  <td><span className="status status-approved">● En línea</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeSessions.length === 0 && <EmptyState title="No hay usuarios conectados" hint="Los usuarios con sesión activa aparecerán aquí." />}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Usuario</th><th>Hora de Ingreso</th><th>Hora de Salida</th><th>Duración</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {sessionPg.pageItems.map(session => (
                  <tr key={session.id}>
                    <td data-label="Usuario"><strong>{session.username}</strong></td>
                    <td data-label="Ingreso">{new Date(session.loginTime).toLocaleString('es-CO')}</td>
                    <td data-label="Salida">{session.logoutTime ? new Date(session.logoutTime).toLocaleString('es-CO') : '—'}</td>
                    <td data-label="Duración">{formatDuration(sessionDuration(session.loginTime, session.logoutTime))}</td>
                    <td data-label="Estado">
                      {session.isActive
                        ? <span className="status status-approved">● Activa</span>
                        : <span className="status status-rejected">Cerrada</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {sessions.length === 0 && <EmptyState title="No hay registros de acceso" hint="Cada inicio y cierre de sesión quedará registrado aquí." />}
          <Pager page={sessionPg.page} totalPages={sessionPg.totalPages} total={sessionPg.total} pageSize={sessionPg.pageSize} onChange={sessionPg.setPage} />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Solicitante</th><th>P/N</th><th>Cantidad</th><th>Disponible</th><th>Motivo</th><th>PDF</th><th>Acciones</th></tr></thead>
            <tbody>
              {approvalPg.pageItems.map(request => {
                const available = getAvailableCount(request.partNumber);
                return (
                  <tr key={request.id}>
                    <td data-label="Fecha">{new Date(request.requestDate).toLocaleDateString('es-CO')}</td>
                    <td data-label="Tipo"><span className={`status ${request.requestType === 'exit' ? 'status-out' : 'status-overhaul'}`}>{request.requestType === 'exit' ? 'Salida' : 'Overhaul'}</span></td>
                    <td data-label="Solicitante">{request.requestedBy}</td>
                    <td data-label="P/N"><strong>{request.partNumber}</strong></td>
                    <td data-label="Cantidad">{request.quantity}</td>
                    <td data-label="Disponible">{available}</td>
                    <td data-label="Motivo">{request.notes || '-'}</td>
                    <td data-label="PDF">{request.requestPdfUrl ? <a href={request.requestPdfUrl} download={request.requestPdfName} className="pdf-link" target="_blank" rel="noopener noreferrer"><Icon name="file" size={15} /> Ver PDF</a> : '-'}</td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        <button onClick={() => openResolve(request.id, 'approve')} className="btn-soft btn-soft-ok" disabled={available < request.quantity}>Aprobar</button>
                        <button onClick={() => openResolve(request.id, 'reject')} className="btn-soft btn-soft-delete">Rechazar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pendingRequests.length === 0 && <EmptyState title="No hay solicitudes pendientes" hint="Cuando alguien envíe una solicitud, aparecerá aquí para aprobarla." />}
          <Pager page={approvalPg.page} totalPages={approvalPg.totalPages} total={approvalPg.total} pageSize={approvalPg.pageSize} onChange={approvalPg.setPage} />
        </div>
      )}

      {activeTab === 'tickets' && (
        <>
          <div className="page-header">
            <h3>Tickets</h3>
            <button onClick={() => setShowTicketForm(true)} className="btn-primary"><Icon name="plus" size={15} /> Crear Ticket</button>
          </div>
          <Drawer open={showTicketForm} title="Nuevo Ticket" onClose={() => setShowTicketForm(false)}>
            <form onSubmit={handleSubmitTicket} className="form-card">
              <div className="form-grid">
                <select value={ticketForm.type} onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value as any })} required>
                  <option value="user_block">Usuario Bloqueado</option>
                  <option value="platform_failure">Error en la Plataforma</option>
                  <option value="request">Solicitud</option>
                  <option value="other">Otro</option>
                </select>
                <select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })} required>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
                <input type="text" placeholder="Titulo" value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} required style={{ gridColumn: '1 / -1' }} />
                <textarea placeholder="Descripcion" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} required rows={3} style={{ gridColumn: '1 / -1', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTicketForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Ticket</button>
              </div>
            </form>
          </Drawer>
          <div className="table-container">
            <table>
              <thead><tr><th>Ticket #</th><th>Tipo</th><th>Título</th><th>Prioridad</th><th>Creado por</th><th>Fecha</th><th>Estado</th><th>Resuelto por</th></tr></thead>
              <tbody>
                {ticketPg.pageItems.map(ticket => (
                  <tr key={ticket.id}>
                    <td data-label="Ticket"><strong>{ticket.ticketNumber}</strong></td>
                    <td data-label="Tipo">{ticket.type === 'user_block' ? 'Usuario Bloqueado' : ticket.type === 'platform_failure' ? 'Error Plataforma' : ticket.type === 'request' ? 'Solicitud' : 'Otro'}</td>
                    <td data-label="Título">{ticket.title}</td>
                    <td data-label="Prioridad"><span className={`priority priority-${ticket.priority}`}>{ticket.priority === 'critical' ? 'CRÍTICA' : ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Media' : 'Baja'}</span></td>
                    <td data-label="Creado por">{ticket.createdBy}</td>
                    <td data-label="Fecha">{new Date(ticket.createdDate).toLocaleDateString('es-CO')}</td>
                    <td data-label="Estado"><span className={`status status-${ticket.status}`}>{ticket.status === 'open' ? 'Abierto' : ticket.status === 'in_progress' ? 'En Progreso' : ticket.status === 'resolved' ? 'Resuelto' : 'Cerrado'}</span></td>
                    <td data-label="Resuelto por">{ticket.resolvedBy ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{ticket.resolvedBy}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openTickets.length === 0 && <EmptyState title="No hay tickets abiertos" hint="Los tickets nuevos aparecerán aquí." />}
          </div>
          <Pager page={ticketPg.page} totalPages={ticketPg.totalPages} total={ticketPg.total} pageSize={ticketPg.pageSize} onChange={ticketPg.setPage} />
        </>
      )}

      {/* ── Modal: resolver solicitud (aprobar / rechazar con observaciones) ── */}
      {resolveModal && (() => {
        const req = requests.find(r => r.id === resolveModal.requestId);
        const isApprove = resolveModal.action === 'approve';
        return (
          <div className="modal-overlay" onClick={closeResolve}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>{isApprove ? 'Aprobar solicitud' : 'Rechazar solicitud'}</h3>
              {req && (
                <div className="resolve-summary">
                  <div><span>Solicitante:</span> <strong>{req.requestedBy}</strong></div>
                  <div><span>Tipo:</span> <strong>{req.requestType === 'exit' ? 'Salida' : 'Overhaul'}</strong></div>
                  <div><span>P/N:</span> <strong>{req.partNumber}</strong></div>
                  <div><span>Cantidad:</span> <strong>{req.quantity}</strong></div>
                </div>
              )}
              <label className="resolve-label">
                Observaciones {isApprove ? '(opcional)' : '(recomendado)'}
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder={isApprove ? 'Ej: Aprobado, retirar del estante A-01...' : 'Ej: No procede por falta de justificación...'}
                />
              </label>
              <div className="modal-actions">
                <button
                  className={isApprove ? 'btn-approve' : 'btn-reject'}
                  onClick={handleResolveSubmit}
                >
                  {isApprove ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                </button>
                <button className="btn-cancel" onClick={closeResolve}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminPanel;
