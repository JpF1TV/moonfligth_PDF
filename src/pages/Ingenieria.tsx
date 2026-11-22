import React, { useState } from 'react';
import { useEngineering } from '../context/EngineeringContext';
import { useOperations } from '../context/OperationsContext';
import { useOMA } from '../context/OMAContext';
import { useAuth } from '../context/AuthContext';
import { AircraftComponent } from '../types';
import { canEdit, canDelete } from '../utils/permissions';
import { useToast } from '../context/ToastContext';
import { useAudit } from '../context/AuditContext';
import { useConfirm } from '../context/ConfirmContext';
import ModuleIcon from '../components/ModuleIcon';
import Icon from '../components/Icon';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

const emptyForm = {
  aircraftId: '', description: '', partNumber: '', serialNumber: '',
  installDate: '', installHours: '', installCycles: '',
  limitHours: '', limitCycles: '', limitDate: '',
  alertHours: '', alertCycles: '', alertDays: '', notes: '',
};

const Ingenieria: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { logAudit } = useAudit();
  const confirm = useConfirm();
  const { components, addComponent, updateComponent, deleteComponent } = useEngineering();
  const { aircraft } = useOperations();
  const { generateFromComponent } = useOMA();

  const puedeEditar = canEdit(user, 'ingenieria');
  const puedeEliminar = canDelete(user, 'ingenieria');

  const [filterAircraft, setFilterAircraft] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const submitComponent = (e: React.FormEvent) => {
    e.preventDefault();
    const ac = aircraft.find(a => a.id === form.aircraftId);
    if (!ac) return;
    const base: Omit<AircraftComponent, 'id' | 'status'> = {
      aircraftId: ac.id,
      aircraftRegistration: ac.registration,
      description: form.description,
      partNumber: form.partNumber,
      serialNumber: form.serialNumber,
      installDate: form.installDate,
      installHours: parseFloat(form.installHours) || 0,
      installCycles: parseInt(form.installCycles) || 0,
      limitHours: form.limitHours ? parseFloat(form.limitHours) : undefined,
      limitCycles: form.limitCycles ? parseInt(form.limitCycles) : undefined,
      limitDate: form.limitDate || undefined,
      alertHours: form.alertHours ? parseFloat(form.alertHours) : undefined,
      alertCycles: form.alertCycles ? parseInt(form.alertCycles) : undefined,
      alertDays: form.alertDays ? parseInt(form.alertDays) : undefined,
      notes: form.notes,
    };
    if (editingId) {
      updateComponent(editingId, base);
      logAudit({ module: 'ingenieria', action: 'update', user: user?.username || '', description: `Editó el componente "${base.description}" (${ac.registration})`, reference: base.partNumber });
    } else {
      addComponent(base);
      logAudit({ module: 'ingenieria', action: 'create', user: user?.username || '', description: `Agregó el componente "${base.description}" (${ac.registration})`, reference: base.partNumber });
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (c: AircraftComponent) => {
    setEditingId(c.id);
    setForm({
      aircraftId: c.aircraftId,
      description: c.description,
      partNumber: c.partNumber,
      serialNumber: c.serialNumber,
      installDate: c.installDate,
      installHours: String(c.installHours),
      installCycles: String(c.installCycles),
      limitHours: c.limitHours != null ? String(c.limitHours) : '',
      limitCycles: c.limitCycles != null ? String(c.limitCycles) : '',
      limitDate: c.limitDate || '',
      alertHours: c.alertHours != null ? String(c.alertHours) : '',
      alertCycles: c.alertCycles != null ? String(c.alertCycles) : '',
      alertDays: c.alertDays != null ? String(c.alertDays) : '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (c: AircraftComponent) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar componente',
      message: `Se eliminará "${c.description}" (${c.partNumber}). Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deleteComponent(c.id);
      logAudit({ module: 'ingenieria', action: 'delete', user: user?.username || '', description: `Eliminó el componente "${c.description}" (${c.partNumber})`, reference: c.partNumber });
    }
  };

  const cancelForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleGenerateOT = (c: AircraftComponent) => {
    const projected = new Date();
    projected.setDate(projected.getDate() + 7);
    generateFromComponent({
      componentId: c.id,
      aircraftId: c.aircraftId,
      aircraftRegistration: c.aircraftRegistration,
      description: `Mantenimiento: ${c.description}`,
      taskCode: `TASK-${c.partNumber}`,
      projectedDate: projected.toISOString().split('T')[0],
      createdBy: user?.username || 'sistema',
    });
    logAudit({ module: 'oma', action: 'create', user: user?.username || '', description: `Generó OT automática desde componente "${c.description}" (${c.aircraftRegistration})`, reference: c.partNumber });
    toast.success(`Orden de Trabajo generada para: ${c.description}`);
  };

  const filtered = components.filter(c =>
    (!filterAircraft || c.aircraftId === filterAircraft) &&
    (!filterStatus || c.status === filterStatus)
  );

  const alerts = components.filter(c => c.status === 'alert' || c.status === 'overdue');
  const pg = usePagination(filtered, 10);

  const statusLabel = (s: AircraftComponent['status']) => {
    if (s === 'ok') return <span className="status status-approved">OK</span>;
    if (s === 'alert') return <span className="status status-pending">Alerta</span>;
    return <span className="status status-rejected">Vencido</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="ingenieria" size={22} /> Ingeniería</h2>
        {puedeEditar && (
          <button className="btn-primary" onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}>
            <Icon name="plus" size={15} /> Agregar Componente
          </button>
        )}
      </div>

      {/* Alertas activas */}
      {alerts.length > 0 && (
        <div className="warn-box">
          <strong>{alerts.length} componente(s) requieren atención:</strong>
          <ul>
            {alerts.map(c => (
              <li key={c.id} className={c.status === 'overdue' ? 'is-overdue' : ''}>
                {c.aircraftRegistration} — {c.description} ({c.partNumber}) — {c.status === 'overdue' ? 'VENCIDO' : 'EN ALERTA'}
                {' '}
                <button className="btn-soft btn-soft-warn" style={{ marginLeft: 8 }} onClick={() => handleGenerateOT(c)}>
                  Generar OT
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {puedeEditar && (
        <Drawer
          open={showForm}
          wide
          title={editingId ? 'Editar Componente' : 'Nuevo Componente'}
          onClose={cancelForm}
        >
        <form className="form-card" onSubmit={submitComponent}>
          <div className="form-grid">
            <select value={form.aircraftId} onChange={e => setForm(p => ({ ...p, aircraftId: e.target.value }))} required>
              <option value="">Seleccionar aeronave</option>
              {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} - {a.model}</option>)}
            </select>
            <input placeholder="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
            <input placeholder="Part Number" value={form.partNumber} onChange={e => setForm(p => ({ ...p, partNumber: e.target.value }))} required />
            <input placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} required />
            <input type="date" placeholder="Fecha instalación" value={form.installDate} onChange={e => setForm(p => ({ ...p, installDate: e.target.value }))} required />
            <input type="number" placeholder="Horas avión al instalar" value={form.installHours} onChange={e => setForm(p => ({ ...p, installHours: e.target.value }))} required />
            <input type="number" placeholder="Ciclos avión al instalar" value={form.installCycles} onChange={e => setForm(p => ({ ...p, installCycles: e.target.value }))} required />
          </div>
          <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '10px 0 5px' }}>Límites de vida (dejar vacío si no aplica):</p>
          <div className="form-grid">
            <input type="number" placeholder="Límite horas" value={form.limitHours} onChange={e => setForm(p => ({ ...p, limitHours: e.target.value }))} />
            <input type="number" placeholder="Límite ciclos" value={form.limitCycles} onChange={e => setForm(p => ({ ...p, limitCycles: e.target.value }))} />
            <input type="date" placeholder="Fecha límite" value={form.limitDate} onChange={e => setForm(p => ({ ...p, limitDate: e.target.value }))} />
            <input type="number" placeholder="Alerta horas remanentes" value={form.alertHours} onChange={e => setForm(p => ({ ...p, alertHours: e.target.value }))} />
            <input type="number" placeholder="Alerta ciclos remanentes" value={form.alertCycles} onChange={e => setForm(p => ({ ...p, alertCycles: e.target.value }))} />
            <input type="number" placeholder="Alerta días remanentes" value={form.alertDays} onChange={e => setForm(p => ({ ...p, alertDays: e.target.value }))} />
          </div>
          <div className="form-grid">
            <input placeholder="Notas" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div className="form-actions" style={{ marginTop: 15 }}>
            <button type="button" className="btn-secondary" onClick={cancelForm}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Guardar Cambios' : 'Guardar Componente'}</button>
          </div>
        </form>
        </Drawer>
      )}

      {/* Filtros */}
      <div className="form-grid" style={{ marginBottom: 20 }}>
        <select value={filterAircraft} onChange={e => setFilterAircraft(e.target.value)}>
          <option value="">Todas las aeronaves</option>
          {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ok">OK</option>
          <option value="alert">En Alerta</option>
          <option value="overdue">Vencido</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay componentes para mostrar"
          hint={components.length === 0 ? 'Registra el primer componente con vida límite de una aeronave.' : 'Prueba con otros filtros.'}
          action={puedeEditar && components.length === 0 ? { label: 'Agregar el primer componente', onClick: () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); } } : undefined}
        />
      ) : (
        <>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Aeronave</th><th>Componente</th><th>P/N</th><th>S/N</th>
                <th>Instalado</th><th>Límite Horas</th><th>Límite Ciclos</th><th>Fecha Límite</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pg.pageItems.map(c => (
                <tr key={c.id} className={c.status === 'overdue' ? 'row-danger' : c.status === 'alert' ? 'row-warn' : ''}>
                  <td data-label="Aeronave"><strong>{c.aircraftRegistration}</strong></td>
                  <td data-label="Componente">{c.description}</td>
                  <td data-label="P/N">{c.partNumber}</td>
                  <td data-label="S/N">{c.serialNumber}</td>
                  <td data-label="Instalado">{c.installDate}</td>
                  <td data-label="Límite horas">{c.limitHours ? `${c.limitHours} h` : '—'}</td>
                  <td data-label="Límite ciclos">{c.limitCycles ? `${c.limitCycles} ciclos` : '—'}</td>
                  <td data-label="Fecha límite">{c.limitDate || '—'}</td>
                  <td data-label="Estado">{statusLabel(c.status)}</td>
                  <td data-label="Acciones">
                    <div className="actions-cell">
                      {(c.status === 'alert' || c.status === 'overdue') && (
                        <button className="btn-soft btn-soft-warn" onClick={() => handleGenerateOT(c)}>Generar OT</button>
                      )}
                      {puedeEditar && (
                        <button className="btn-icon sm edit" onClick={() => startEdit(c)} title="Editar" aria-label="Editar">
                          <Icon name="edit" size={15} />
                        </button>
                      )}
                      {puedeEliminar && (
                        <button className="btn-icon sm delete" onClick={() => handleDelete(c)} title="Eliminar" aria-label="Eliminar">
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} totalPages={pg.totalPages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
        </>
      )}
    </div>
  );
};

export default Ingenieria;
