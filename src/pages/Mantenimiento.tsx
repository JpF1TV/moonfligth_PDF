import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { canManageOwn } from '../utils/permissions';
import { useToast } from '../context/ToastContext';
import { useAudit } from '../context/AuditContext';
import { useConfirm } from '../context/ConfirmContext';
import ModuleIcon from '../components/ModuleIcon';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

const Mantenimiento: React.FC = () => {
  const { parts, requests, addRequest, updateRequest, deleteRequest } = useData();
  const { user } = useAuth();
  const { tickets, addTicket, updateTicket, deleteTicket } = useTickets();
  const toast = useToast();
  const { logAudit } = useAudit();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'solicitud' | 'mis-solicitudes' | 'tickets'>('solicitud');
  const [formData, setFormData] = useState({
    partNumber: '',
    quantity: 1,
    notes: '',
    requestPdf: null as File | null
  });

  const [ticketForm, setTicketForm] = useState({
    type: 'other' as 'user_block' | 'platform_failure' | 'request' | 'other',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });

  const [editTicketId, setEditTicketId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRequest: any = {
      partNumber: formData.partNumber,
      quantity: formData.quantity,
      notes: formData.notes,
      requestedBy: user?.username || '',
      requestDate: new Date().toISOString(),
      status: 'pending',
      requestType: 'exit'
    };

    // Si hay PDF, procesarlo
    if (formData.requestPdf) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newRequest.requestPdfUrl = e.target?.result as string;
        newRequest.requestPdfName = formData.requestPdf?.name;
        addRequest(newRequest);
        logAudit({ module: 'solicitudes', action: 'create', user: user?.username || '', description: `Creó solicitud de ${formData.partNumber} (x${formData.quantity})`, reference: formData.partNumber });
        toast.success('Solicitud enviada exitosamente');
      };
      reader.readAsDataURL(formData.requestPdf);
    } else {
      addRequest(newRequest);
      logAudit({ module: 'solicitudes', action: 'create', user: user?.username || '', description: `Creó solicitud de ${formData.partNumber} (x${formData.quantity})`, reference: formData.partNumber });
      toast.success('Solicitud enviada exitosamente');
    }
    
    setFormData({ partNumber: '', quantity: 1, notes: '', requestPdf: null });
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTicketId) {
      updateTicket(editTicketId, { ...ticketForm });
      logAudit({ module: 'mantenimiento', action: 'update', user: user?.username || '', description: `Editó el ticket "${ticketForm.title}"` });
      setEditTicketId(null);
      setTicketForm({ type: 'other', title: '', description: '', priority: 'medium' });
      toast.success('Ticket actualizado.');
      return;
    }
    addTicket({
      ...ticketForm,
      createdBy: user?.username || '',
      status: 'open'
    });
    logAudit({ module: 'mantenimiento', action: 'create', user: user?.username || '', description: `Creó el ticket "${ticketForm.title}"` });
    setTicketForm({ type: 'other', title: '', description: '', priority: 'medium' });
    toast.success('Ticket creado. Será atendido por el administrador.');
  };

  const startEditTicket = (ticketId: string) => {
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    setEditTicketId(ticketId);
    setTicketForm({ type: t.type, title: t.title, description: t.description, priority: t.priority });
    setActiveTab('tickets');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    const ok = await confirm({ danger: true, title: 'Eliminar ticket', message: `Se eliminará el ticket ${ticketNumber}. Esta acción no se puede deshacer.` });
    if (ok) {
      deleteTicket(ticketId);
      logAudit({ module: 'mantenimiento', action: 'delete', user: user?.username || '', description: `Eliminó el ticket ${ticketNumber}`, reference: ticketNumber });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const ok = await confirm({ danger: true, title: 'Eliminar solicitud', message: 'Se eliminará esta solicitud. Esta acción no se puede deshacer.' });
    if (ok) {
      deleteRequest(requestId);
      logAudit({ module: 'solicitudes', action: 'delete', user: user?.username || '', description: 'Eliminó una solicitud propia' });
    }
  };

  const myTickets = tickets.filter(t => t.createdBy === user?.username);

  const myRequests = requests.filter(r => r.requestedBy === user?.username);
  const reqPg = usePagination(myRequests, 10);
  const tktPg = usePagination(myTickets, 10);

  const getAvailableCount = (description: string) => {
    const part = parts.find(p => p.description === description);
    if (!part) return 0;
    return part.items.filter(i => i.status === 'available').length;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="mantenimiento" size={22} /> Mantenimiento</h2>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'solicitud' ? 'active' : ''}`}
          onClick={() => setActiveTab('solicitud')}
        >
          Nueva Solicitud
        </button>
        <button 
          className={`tab ${activeTab === 'mis-solicitudes' ? 'active' : ''}`}
          onClick={() => setActiveTab('mis-solicitudes')}
        >
          Mis Solicitudes ({myRequests.length})
        </button>
        <button 
          className={`tab ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          Tickets ({myTickets.length})
        </button>
      </div>

      {activeTab === 'solicitud' && (
        <div className="maintenance-form-container">
          <form onSubmit={handleSubmit} className="form-card">
            <h3>Solicitar Piezas</h3>
            <div className="form-grid">
              <select
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                required
              >
                <option value="">Seleccionar pieza...</option>
                {parts.filter(p => getAvailableCount(p.description) > 0).map(part => (
                  <option key={part.id} value={part.items[0]?.partNumber || ''}>
                    {part.description} (Disponible: {getAvailableCount(part.description)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Cantidad"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                min="1"
                required
              />
              <input
                type="text"
                placeholder="Motivo/Notas"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ gridColumn: '1 / -1' }}
                required
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFormData({ ...formData, requestPdf: file });
                    }}
                    style={{ display: 'none' }}
                  />
                  <span className="file-upload-btn">
                    {formData.requestPdf ? formData.requestPdf.name : 'Adjuntar PDF de Solicitud (opcional)'}
                  </span>
                </label>
              </div>
            </div>
            <button type="submit" className="btn-primary">Enviar Solicitud</button>
          </form>

          <div className="info-box">
            <h4>Información</h4>
            <p>• Las solicitudes serán revisadas por el departamento administrativo</p>
            <p>• Puedes adjuntar un PDF con la solicitud oficial si la tienes</p>
            <p>• Recibirás notificación cuando tu solicitud sea aprobada o rechazada</p>
          </div>
        </div>
      )}

      {activeTab === 'mis-solicitudes' && (
        myRequests.length === 0 ? (
          <EmptyState
            title="No tienes solicitudes registradas"
            hint="Crea una solicitud de piezas y aquí podrás seguir su aprobación."
            action={{ label: 'Nueva solicitud', onClick: () => setActiveTab('solicitud') }}
          />
        ) : (
        <>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>P/N</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Aprobado/Rechazado Por</th>
                <th>Observaciones</th>
                <th>Notas</th>
                <th>PDF</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reqPg.pageItems.map(request => (
                <tr key={request.id}>
                  <td data-label="Fecha">{new Date(request.requestDate).toLocaleDateString('es-MX')}</td>
                  <td data-label="Tipo">
                    <span className={`status ${request.requestType === 'exit' ? 'status-out' : 'status-overhaul'}`}>
                      {request.requestType === 'exit' ? 'Salida' : 'Overhaul'}
                    </span>
                  </td>
                  <td data-label="P/N"><strong>{request.partNumber}</strong></td>
                  <td data-label="Cantidad">{request.quantity}</td>
                  <td data-label="Estado">
                    <span className={`status status-${request.status}`}>
                      {request.status === 'pending' ? 'Pendiente' : 
                       request.status === 'approved' ? 'Aprobado' : 
                       request.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  </td>
                  <td data-label="Resuelto por">
                    {request.approvedBy
                      ? <span>{request.approvedBy}{request.approvalDate ? <><br /><small style={{ color: 'var(--text-faint)' }}>{new Date(request.approvalDate).toLocaleDateString('es-CO')}</small></> : null}</span>
                      : '-'}
                  </td>
                  <td data-label="Observaciones">{request.approvalNotes || '-'}</td>
                  <td data-label="Notas">{request.notes || '-'}</td>
                  <td data-label="PDF">
                    {request.requestPdfUrl ? (
                      <a href={request.requestPdfUrl} download={request.requestPdfName} className="pdf-link">
                        <Icon name="file" size={15} /> {request.requestPdfName}
                      </a>
                    ) : '-'}
                  </td>
                  <td data-label="Acciones">
                    {canManageOwn(user, 'mantenimiento', request.requestedBy) && request.status === 'pending' ? (
                      <button className="btn-icon sm delete" onClick={() => handleDeleteRequest(request.id)} title="Eliminar" aria-label="Eliminar">
                        <Icon name="trash" size={15} />
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={reqPg.page} totalPages={reqPg.totalPages} total={reqPg.total} pageSize={reqPg.pageSize} onChange={reqPg.setPage} />
        </>
        )
      )}

      {activeTab === 'tickets' && (
        <>
          <form onSubmit={handleSubmitTicket} className="form-card">
            <h3>{editTicketId ? 'Editar Ticket' : 'Crear Nuevo Ticket'}</h3>
            <div className="form-grid">
              <select
                value={ticketForm.type}
                onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value as any })}
                required
              >
                <option value="user_block">Usuario Bloqueado</option>
                <option value="platform_failure">Error en la Plataforma</option>
                <option value="request">Solicitud de Funcionalidad</option>
                <option value="other">Otro</option>
              </select>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                required
              >
                <option value="low">Prioridad Baja</option>
                <option value="medium">Prioridad Media</option>
                <option value="high">Prioridad Alta</option>
                <option value="critical">CRÍTICA</option>
              </select>
              <input
                type="text"
                placeholder="Título del ticket"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                required
                style={{ gridColumn: '1 / -1' }}
              />
              <textarea
                placeholder="Descripción detallada del problema o solicitud"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                required
                rows={4}
                style={{ gridColumn: '1 / -1', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">{editTicketId ? 'Guardar Cambios' : 'Crear Ticket'}</button>
              {editTicketId && (
                <button type="button" className="btn-secondary" onClick={() => { setEditTicketId(null); setTicketForm({ type: 'other', title: '', description: '', priority: 'medium' }); }}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <div className="table-container" style={{ marginTop: '30px' }}>
            <h3>Mis Tickets</h3>
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Resuelto Por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tktPg.pageItems.map(ticket => (
                  <tr key={ticket.id}>
                    <td data-label="Ticket"><strong>{ticket.ticketNumber}</strong></td>
                    <td data-label="Tipo">
                      {ticket.type === 'user_block' ? 'Usuario Bloqueado' :
                       ticket.type === 'platform_failure' ? 'Error Plataforma' :
                       ticket.type === 'request' ? 'Solicitud' : 'Otro'}
                    </td>
                    <td data-label="Título">{ticket.title}</td>
                    <td data-label="Prioridad">
                      <span className={`priority priority-${ticket.priority}`}>
                        {ticket.priority === 'critical' ? 'CRÍTICA' :
                         ticket.priority === 'high' ? 'Alta' :
                         ticket.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </td>
                    <td data-label="Fecha">{new Date(ticket.createdDate).toLocaleDateString('es-MX')}</td>
                    <td data-label="Estado">
                      <span className={`status status-${ticket.status}`}>
                        {ticket.status === 'open' ? 'Abierto' :
                         ticket.status === 'in_progress' ? 'En Progreso' :
                         ticket.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                      </span>
                    </td>
                    <td data-label="Resuelto por">
                      {ticket.resolvedBy ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{ticket.resolvedBy}</span>
                      ) : '-'}
                    </td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        {canManageOwn(user, 'mantenimiento', ticket.createdBy) && (ticket.status === 'open' || ticket.status === 'in_progress') ? (
                          <>
                            <button className="btn-icon sm edit" onClick={() => startEditTicket(ticket.id)} title="Editar" aria-label="Editar">
                              <Icon name="edit" size={15} />
                            </button>
                            <button className="btn-icon sm delete" onClick={() => handleDeleteTicket(ticket.id, ticket.ticketNumber)} title="Eliminar" aria-label="Eliminar">
                              <Icon name="trash" size={15} />
                            </button>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myTickets.length === 0 && (
              <EmptyState title="No has creado tickets" hint="Reporta un error o pide una función desde el formulario de arriba." />
            )}
          </div>
          <Pager page={tktPg.page} totalPages={tktPg.totalPages} total={tktPg.total} pageSize={tktPg.pageSize} onChange={tktPg.setPage} />
        </>
      )}
    </div>
  );
};

export default Mantenimiento;
