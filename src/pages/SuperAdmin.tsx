import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useToast } from '../context/ToastContext';
import { useAudit } from '../context/AuditContext';
import { useConfirm } from '../context/ConfirmContext';
import ModuleIcon from '../components/ModuleIcon';
import Icon from '../components/Icon';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

const SuperAdmin: React.FC = () => {
  const { users, addUser, updateUser, deleteUser } = useAuth();
  const { tickets, updateTicket, deleteTicket } = useTickets();
  const toast = useToast();
  const { logAudit } = useAudit();
  const confirm = useConfirm();
  const userPg = usePagination(users.filter(u => u.role !== 'superadmin'), 10);
  const ticketPg = usePagination(tickets, 10);
  const [activeTab, setActiveTab] = useState<'users' | 'tickets'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'requester' as 'admin' | 'warehouse' | 'requester',
    isActive: true,
    avatarUrl: '' as string,
  });

  const handleAvatarUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.warning('La imagen es muy pesada (máx. 1.5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserForm(prev => ({ ...prev, avatarUrl: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      updateUser(editingUser, userForm);
      logAudit({ module: 'usuarios', action: 'update', user: 'superadmin', description: `Editó el usuario "${userForm.username}"` });
      toast.success('Usuario actualizado exitosamente');
    } else {
      addUser(userForm);
      logAudit({ module: 'usuarios', action: 'create', user: 'superadmin', description: `Creó el usuario "${userForm.username}" (${userForm.role})` });
      toast.success('Usuario creado exitosamente');
    }
    
    setUserForm({ username: '', password: '', fullName: '', email: '', role: 'requester', isActive: true, avatarUrl: '' });
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserForm({
        username: user.username,
        password: user.password ?? '',
        fullName: user.fullName ?? '',
        email: user.email || '',
        role: user.role as any,
        isActive: user.isActive ?? true,
        avatarUrl: user.avatarUrl ?? ''
      });
      setEditingUser(userId);
      setShowUserForm(true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const u = users.find(x => x.id === userId);
    const ok = await confirm({
      danger: true,
      title: 'Eliminar usuario',
      message: `Se eliminará el usuario "${u?.username ?? userId}". Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deleteUser(userId);
      logAudit({ module: 'usuarios', action: 'delete', user: 'superadmin', description: `Eliminó el usuario "${u?.username ?? userId}"` });
      toast.info('Usuario eliminado');
    }
  };

  const handleUpdateTicket = (ticketId: string, status: string) => {
    const currentUser = 'superadmin';
    updateTicket(ticketId, { 
      status: status as any,
      resolvedBy: status === 'resolved' || status === 'closed' ? currentUser : undefined,
      resolvedDate: status === 'resolved' || status === 'closed' ? new Date().toISOString() : undefined
    });
    
    if (status === 'resolved') {
      toast.success('Ticket marcado como resuelto.');
    }
  };

  const handleQuickResolve = async (ticketId: string) => {
    const ok = await confirm({
      title: 'Resolver ticket',
      message: '¿Marcar este ticket como resuelto?',
      confirmLabel: 'Marcar como resuelto',
    });
    if (ok) {
      handleUpdateTicket(ticketId, 'resolved');
    }
  };

  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar ticket',
      message: `Se eliminará el ticket ${ticketNumber}. Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deleteTicket(ticketId);
      logAudit({ module: 'mantenimiento', action: 'delete', user: 'superadmin', description: `Eliminó el ticket ${ticketNumber}`, reference: ticketNumber });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="superadmin" size={22} /> Super Administrador</h2>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Gestión de Usuarios ({users.length})
        </button>
        <button 
          className={`tab ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          Gestión de Tickets ({tickets.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="page-header">
            <h3>Usuarios del Sistema</h3>
            <button onClick={() => { setEditingUser(null); setUserForm({ username: '', password: '', fullName: '', email: '', role: 'requester', isActive: true, avatarUrl: '' }); setShowUserForm(true); }} className="btn-primary">
              <Icon name="plus" size={15} /> Nuevo Usuario
            </button>
          </div>

          <Drawer
            open={showUserForm}
            title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            onClose={() => { setShowUserForm(false); setEditingUser(null); }}
          >
            <form onSubmit={handleAddUser} className="form-card">
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  required
                >
                  <option value="requester">Solicitante</option>
                  <option value="warehouse">Almacén</option>
                  <option value="admin">Administrador</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                  />
                  Usuario Activo
                </label>
              </div>

              {/* Imagen de perfil */}
              <div className="avatar-uploader">
                <div className="avatar-preview">
                  {userForm.avatarUrl
                    ? <img src={userForm.avatarUrl} alt="Avatar" />
                    : <span>{(userForm.username || '?').slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="avatar-uploader-actions">
                  <label className="file-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
                    />
                    {userForm.avatarUrl ? 'Cambiar imagen' : 'Subir imagen de perfil'}
                  </label>
                  {userForm.avatarUrl && (
                    <button type="button" className="btn-cancel" onClick={() => setUserForm({ ...userForm, avatarUrl: '' })}>
                      Quitar
                    </button>
                  )}
                  <span className="avatar-hint">JPG o PNG · máx. 1.5 MB</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancelar</button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </Drawer>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Usuario</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {userPg.pageItems.map(user => (
                  <tr key={user.id}>
                    <td data-label="">
                      <div className="table-avatar">
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt={user.username} />
                          : <span>{user.username.slice(0, 2).toUpperCase()}</span>}
                      </div>
                    </td>
                    <td data-label="Usuario"><strong>{user.username}</strong></td>
                    <td data-label="Nombre">{user.fullName}</td>
                    <td data-label="Email">{user.email || '-'}</td>
                    <td data-label="Rol">
                      <span className={`status status-${user.role}`}>
                        {user.role === 'admin' ? 'Administrador' :
                         user.role === 'warehouse' ? 'Almacén' : 'Solicitante'}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={`status ${user.isActive ? 'status-available' : 'status-out'}`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Último acceso">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-MX') : 'Nunca'}</td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        <button onClick={() => handleEditUser(user.id)} className="btn-icon sm edit" title="Editar" aria-label="Editar">
                          <Icon name="edit" size={15} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="btn-icon sm delete" title="Eliminar" aria-label="Eliminar">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={userPg.page} totalPages={userPg.totalPages} total={userPg.total} pageSize={userPg.pageSize} onChange={userPg.setPage} />
        </>
      )}

      {activeTab === 'tickets' && (
        <div className="table-container">
          <h3>Gestión de Tickets</h3>
          <table>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Tipo</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Prioridad</th>
                <th>Creado Por</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Resuelto Por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ticketPg.pageItems.map(ticket => (
                <tr key={ticket.id}>
                  <td data-label="Ticket"><strong>{ticket.ticketNumber}</strong></td>
                  <td data-label="Tipo">
                    {ticket.type === 'user_block' ? 'Usuario Bloqueado' :
                     ticket.type === 'platform_failure' ? 'Error Plataforma' :
                     ticket.type === 'request' ? 'Solicitud' : 'Otro'}
                  </td>
                  <td data-label="Título">{ticket.title}</td>
                  <td data-label="Descripción" style={{ fontSize: '12px', maxWidth: '200px' }}>{ticket.description}</td>
                  <td data-label="Prioridad">
                    <span className={`priority priority-${ticket.priority}`}>
                      {ticket.priority === 'critical' ? 'CRÍTICA' :
                       ticket.priority === 'high' ? 'Alta' :
                       ticket.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </td>
                  <td data-label="Creado por">{ticket.createdBy}</td>
                  <td data-label="Fecha">{new Date(ticket.createdDate).toLocaleDateString('es-MX')}</td>
                  <td data-label="Estado">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateTicket(ticket.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </td>
                  <td data-label="Resuelto por">{ticket.resolvedBy || '-'}</td>
                  <td data-label="Acciones">
                    <div className="actions-cell">
                      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                        <button
                          onClick={() => handleQuickResolve(ticket.id)}
                          className="btn-soft btn-soft-ok"
                          title="Marcar como resuelto"
                        >
                          Resolver
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTicket(ticket.id, ticket.ticketNumber)}
                        className="btn-icon sm delete"
                        title="Eliminar ticket"
                        aria-label="Eliminar ticket"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <EmptyState title="No hay tickets registrados" hint="Los tickets que creen los usuarios aparecerán aquí." />
          )}
          <Pager page={ticketPg.page} totalPages={ticketPg.totalPages} total={ticketPg.total} pageSize={ticketPg.pageSize} onChange={ticketPg.setPage} />
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
