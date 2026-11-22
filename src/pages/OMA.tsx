import React, { useState } from 'react';
import { useOMA } from '../context/OMAContext';
import { useOperations } from '../context/OperationsContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { WorkOrder, WorkOrderPart } from '../types';
import { downloadMCM002PDF } from '../components/MCM002PDF';
import { canEdit, canDelete } from '../utils/permissions';
import { useAudit } from '../context/AuditContext';
import { useConfirm } from '../context/ConfirmContext';
import Drawer from '../components/Drawer';
import Icon from '../components/Icon';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';


/* ═══════════════════════════════════════════════════════════════════════════════
   printMCM002 – Genera y descarga PDF con @react-pdf/renderer
   ═══════════════════════════════════════════════════════════════════════════════ */

function printMCM002(w: WorkOrder) {
  downloadMCM002PDF(w);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Componente OMA
   ═══════════════════════════════════════════════════════════════════════════════ */

const OMA: React.FC = () => {
  const { workOrders, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useOMA();
  const { aircraft } = useOperations();
  const { user } = useAuth();
  const { logAudit } = useAudit();
  const confirm = useConfirm();
  useData(); // disponible si se necesita inventario

  const puedeEditar = canEdit(user, 'oma');
  const puedeEliminar = canDelete(user, 'oma');

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAircraft, setFilterAircraft] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closeWO, setCloseWO] = useState<WorkOrder | null>(null);

  // ── Form state (creación) ────────────────────────────────────────────────────
  const [elaborationDate, setElaborationDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectedDate, setProjectedDate] = useState('');
  const [directedTo, setDirectedTo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [acModel, setAcModel] = useState('');
  const [acRegistration, setAcRegistration] = useState('');
  const [acSerialNumber, setAcSerialNumber] = useState('');
  const [ttAcCreation, setTtAcCreation] = useState(0);
  const [tcAcCreation, setTcAcCreation] = useState(0);
  const [componentDesc, setComponentDesc] = useState('');
  const [componentPN, setComponentPN] = useState('');
  const [componentSN, setComponentSN] = useState('');
  const [tsnTsoCreation, setTsnTsoCreation] = useState(0);
  const [csnCsoCreation, setCsnCsoCreation] = useState(0);
  const [taskCode, setTaskCode] = useState('');
  const [description, setDescription] = useState('');
  const [generatedBy, setGeneratedBy] = useState(user?.username || '');

  // ── Close form state ─────────────────────────────────────────────────────────
  const [closeCompletionDate, setCloseCompletionDate] = useState('');
  const [closeReceptionDate, setCloseReceptionDate] = useState('');
  const [closeTtAc, setCloseTtAc] = useState(0);
  const [closeTcAc, setCloseTcAc] = useState(0);
  const [closeTsnTso, setCloseTsnTso] = useState(0);
  const [closeCsnCso, setCloseCsnCso] = useState(0);
  const [closeOmaCertRef, setCloseOmaCertRef] = useState('');

  // ── Seleccionar aeronave (auto-fill) ─────────────────────────────────────────
  const handleAircraftSelect = (id: string) => {
    setSelectedAircraftId(id);
    const ac = aircraft.find(a => a.id === id);
    if (ac) {
      setAcModel(ac.model);
      setAcRegistration(ac.registration);
      setAcSerialNumber(ac.serialNumber);
      setTtAcCreation(ac.totalHours);
      setTcAcCreation(ac.totalCycles);
    } else {
      setAcModel('');
      setAcRegistration('');
      setAcSerialNumber('');
      setTtAcCreation(0);
      setTcAcCreation(0);
    }
  };

  // ── Reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setElaborationDate(new Date().toISOString().split('T')[0]);
    setProjectedDate('');
    setDirectedTo('');
    setPriority('medium');
    setSelectedAircraftId('');
    setAcModel('');
    setAcRegistration('');
    setAcSerialNumber('');
    setTtAcCreation(0);
    setTcAcCreation(0);
    setComponentDesc('');
    setComponentPN('');
    setComponentSN('');
    setTsnTsoCreation(0);
    setCsnCsoCreation(0);
    setTaskCode('');
    setDescription('');
    setGeneratedBy(user?.username || '');
  };

  // ── Submit creación / edición ─────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      elaborationDate,
      projectedDate,
      directedTo,
      aircraftId: selectedAircraftId,
      aircraftModel: acModel,
      aircraftRegistration: acRegistration,
      aircraftSerialNumber: acSerialNumber,
      ttAcCreation,
      tcAcCreation,
      componentDesc,
      componentPN,
      componentSN,
      tsnTsoCreation,
      csnCsoCreation,
      taskCode,
      description,
      generatedBy,
      priority,
    };

    if (editingId) {
      // Edición: actualiza sin cambiar estado ni imprimir automáticamente
      updateWorkOrder(editingId, payload as Partial<WorkOrder>);
      logAudit({ module: 'oma', action: 'update', user: user?.username || '', description: `Editó orden de trabajo (${acRegistration} · ${componentDesc})` });
      resetForm();
      setEditingId(null);
      setShowForm(false);
      return;
    }

    const newWO: Omit<WorkOrder, 'id' | 'workOrderNumber' | 'createdDate'> = {
      ...payload,
      type: 'scheduled',
      status: 'pending',
      partsRequired: [] as WorkOrderPart[],
      partsAvailable: false,
      createdBy: user?.username || 'admin',
      autoGenerated: false,
    } as Omit<WorkOrder, 'id' | 'workOrderNumber' | 'createdDate'>;
    addWorkOrder(newWO);
    logAudit({ module: 'oma', action: 'create', user: user?.username || '', description: `Creó orden de trabajo (${acRegistration} · ${componentDesc})`, reference: acRegistration });

    // Imprimir con los datos recién creados
    const tempWO: WorkOrder = {
      ...newWO,
      id: 'temp',
      workOrderNumber: 'OT-NUEVA',
      createdDate: new Date().toISOString(),
    };
    printMCM002(tempWO);

    resetForm();
    setShowForm(false);
  };

  // ── Abrir edición ──────────────────────────────────────────────────────────────
  const openEdit = (wo: WorkOrder) => {
    setEditingId(wo.id);
    setElaborationDate((wo as any).elaborationDate || new Date().toISOString().split('T')[0]);
    setProjectedDate(wo.projectedDate || '');
    setDirectedTo((wo as any).directedTo || '');
    setPriority(wo.priority);
    setSelectedAircraftId(wo.aircraftId);
    setAcModel((wo as any).aircraftModel || '');
    setAcRegistration(wo.aircraftRegistration);
    setAcSerialNumber((wo as any).aircraftSerialNumber || '');
    setTtAcCreation((wo as any).ttAcCreation || 0);
    setTcAcCreation((wo as any).tcAcCreation || 0);
    setComponentDesc((wo as any).componentDesc || '');
    setComponentPN((wo as any).componentPN || '');
    setComponentSN((wo as any).componentSN || '');
    setTsnTsoCreation((wo as any).tsnTsoCreation || 0);
    setCsnCsoCreation((wo as any).csnCsoCreation || 0);
    setTaskCode(wo.taskCode);
    setDescription(wo.description);
    setGeneratedBy((wo as any).generatedBy || user?.username || '');
    setShowForm(true);
  };

  // ── Eliminar OT ──────────────────────────────────────────────────────────────
  const handleDelete = async (wo: WorkOrder) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar orden de trabajo',
      message: `Se eliminará la orden ${wo.workOrderNumber}. Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deleteWorkOrder(wo.id);
      logAudit({ module: 'oma', action: 'delete', user: user?.username || '', description: `Eliminó la orden de trabajo ${wo.workOrderNumber}`, reference: wo.workOrderNumber });
    }
  };

  // ── Submit cierre ────────────────────────────────────────────────────────────
  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeWO) return;
    const updates: Partial<WorkOrder> = {
      status: 'completed',
      completionDate: closeCompletionDate,
      receptionDate: closeReceptionDate,
      ttAcCompletion: closeTtAc,
      tcAcCompletion: closeTcAc,
      tsnTsoCompletion: closeTsnTso,
      csnCsoCompletion: closeCsnCso,
      omaCertRef: closeOmaCertRef,
    };
    updateWorkOrder(closeWO.id, updates);
    logAudit({ module: 'oma', action: 'status', user: user?.username || '', description: `Cerró (completó) la orden ${closeWO.workOrderNumber}`, reference: closeWO.workOrderNumber });
    printMCM002({ ...closeWO, ...updates });
    setCloseWO(null);
  };

  // ── Abrir modal cierre ───────────────────────────────────────────────────────
  const openCloseModal = (wo: WorkOrder) => {
    setCloseWO(wo);
    setCloseCompletionDate(new Date().toISOString().split('T')[0]);
    setCloseReceptionDate('');
    setCloseTtAc(wo.ttAcCreation);
    setCloseTcAc(wo.tcAcCreation);
    setCloseTsnTso(wo.tsnTsoCreation);
    setCloseCsnCso(wo.csnCsoCreation);
    setCloseOmaCertRef('');
  };

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const filteredOrders = workOrders.filter(wo => {
    if (filterStatus !== 'all' && wo.status !== filterStatus) return false;
    if (filterAircraft !== 'all' && wo.aircraftId !== filterAircraft) return false;
    return true;
  });

  const pg = usePagination(filteredOrders, 10);
  const pageItems = pg.pageItems;

  // ── Conteos ──────────────────────────────────────────────────────────────────
  const counts = {
    pending: workOrders.filter(w => w.status === 'pending').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
    cancelled: workOrders.filter(w => w.status === 'cancelled').length,
  };

  const autoGenPending = workOrders.filter(w => w.autoGenerated && w.status === 'pending');

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-container">
      <h2>OMA - Órdenes de Trabajo (MCM-002)</h2>

      {/* ── Alerta auto-generadas ─────────────────────────────────────────── */}
      {autoGenPending.length > 0 && (
        <div className="alert-banner">
          Hay <strong>{autoGenPending.length}</strong> orden(es) de trabajo generada(s)
          automáticamente pendiente(s) de revisión.
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="summary-cards">
        <div className="summary-card pending">
          <span className="summary-number">{counts.pending}</span>
          <span className="summary-label">Pendientes</span>
        </div>
        <div className="summary-card in-progress">
          <span className="summary-number">{counts.in_progress}</span>
          <span className="summary-label">En Progreso</span>
        </div>
        <div className="summary-card completed">
          <span className="summary-number">{counts.completed}</span>
          <span className="summary-label">Completadas</span>
        </div>
        <div className="summary-card cancelled">
          <span className="summary-number">{counts.cancelled}</span>
          <span className="summary-label">Canceladas</span>
        </div>
      </div>

      {/* ── Filtros y botón crear ──────────────────────────────────────────── */}
      <div className="toolbar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select value={filterAircraft} onChange={e => setFilterAircraft(e.target.value)}>
          <option value="all">Todas las aeronaves</option>
          {aircraft.map(ac => (
            <option key={ac.id} value={ac.id}>{ac.registration} - {ac.model}</option>
          ))}
        </select>
        {puedeEditar && (
          <button className="btn-primary" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>+ Nueva Orden de Trabajo</button>
        )}
      </div>

      {/* ── Formulario creación ────────────────────────────────────────────── */}
      {puedeEditar && (
        <Drawer
          open={showForm}
          wide
          title={editingId ? 'Editar Orden de Trabajo MCM-002' : 'Nueva Orden de Trabajo MCM-002'}
          onClose={() => { resetForm(); setEditingId(null); setShowForm(false); }}
        >
            <form onSubmit={handleSubmit}>
              {/* Encabezado */}
              <fieldset>
                <legend>Encabezado</legend>
                <div className="form-row">
                  <label>F. Elaboración
                    <input type="date" value={elaborationDate} onChange={e => setElaborationDate(e.target.value)} required />
                  </label>
                  <label>F. Proyectada
                    <input type="date" value={projectedDate} onChange={e => setProjectedDate(e.target.value)} required />
                  </label>
                  <label>Dirigida a
                    <input type="text" value={directedTo} onChange={e => setDirectedTo(e.target.value)} placeholder="Taller / Proveedor" required />
                  </label>
                  <label>Prioridad
                    <select value={priority} onChange={e => setPriority(e.target.value as any)}>
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              {/* AERONAVE */}
              <fieldset>
                <legend>AERONAVE</legend>
                <div className="form-row">
                  <label>Aeronave
                    <select value={selectedAircraftId} onChange={e => handleAircraftSelect(e.target.value)} required>
                      <option value="">-- Seleccionar --</option>
                      {aircraft.map(ac => (
                        <option key={ac.id} value={ac.id}>{ac.registration} - {ac.model}</option>
                      ))}
                    </select>
                  </label>
                  <label>Modelo
                    <input type="text" value={acModel} readOnly />
                  </label>
                  <label>Matrícula
                    <input type="text" value={acRegistration} readOnly />
                  </label>
                  <label>S/N
                    <input type="text" value={acSerialNumber} readOnly />
                  </label>
                </div>
                <div className="form-row">
                  <label>TT A/C
                    <input type="number" value={ttAcCreation} onChange={e => setTtAcCreation(Number(e.target.value))} />
                  </label>
                  <label>TC A/C
                    <input type="number" value={tcAcCreation} onChange={e => setTcAcCreation(Number(e.target.value))} />
                  </label>
                </div>
              </fieldset>

              {/* COMPONENTE */}
              <fieldset>
                <legend>COMPONENTE</legend>
                <div className="form-row">
                  <label>Descripción
                    <input type="text" value={componentDesc} onChange={e => setComponentDesc(e.target.value)} required />
                  </label>
                  <label>P/N
                    <input type="text" value={componentPN} onChange={e => setComponentPN(e.target.value)} />
                  </label>
                  <label>S/N
                    <input type="text" value={componentSN} onChange={e => setComponentSN(e.target.value)} />
                  </label>
                </div>
                <div className="form-row">
                  <label>TSN/TSO
                    <input type="number" value={tsnTsoCreation} onChange={e => setTsnTsoCreation(Number(e.target.value))} />
                  </label>
                  <label>CSN/CSO
                    <input type="number" value={csnCsoCreation} onChange={e => setCsnCsoCreation(Number(e.target.value))} />
                  </label>
                </div>
              </fieldset>

              {/* TAREA */}
              <fieldset>
                <legend>TAREA</legend>
                <div className="form-row">
                  <label>Código de Tarea
                    <input type="text" value={taskCode} onChange={e => setTaskCode(e.target.value)} required />
                  </label>
                  <label>Generado por
                    <input type="text" value={generatedBy} onChange={e => setGeneratedBy(e.target.value)} required />
                  </label>
                </div>
                <label>Descripción de la Tarea
                  <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} required />
                </label>
              </fieldset>

              <div className="form-actions">
                <button type="submit" className="btn-primary">{editingId ? 'Guardar Cambios' : 'Crear y Imprimir MCM-002'}</button>
                <button type="button" className="btn-secondary" onClick={() => { resetForm(); setEditingId(null); setShowForm(false); }}>Cancelar</button>
              </div>
            </form>
        </Drawer>
      )}

      {/* ── Modal Cierre ──────────────────────────────────────────────────── */}
      {closeWO && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Cerrar OT: {closeWO.workOrderNumber}</h3>
            <form onSubmit={handleClose}>
              <div className="form-row">
                <label>Fecha de Cumplimiento
                  <input type="date" value={closeCompletionDate} onChange={e => setCloseCompletionDate(e.target.value)} required />
                </label>
                <label>Fecha de Recepción
                  <input type="date" value={closeReceptionDate} onChange={e => setCloseReceptionDate(e.target.value)} required />
                </label>
              </div>
              <div className="form-row">
                <label>TT A/C al cierre
                  <input type="number" value={closeTtAc} onChange={e => setCloseTtAc(Number(e.target.value))} required />
                </label>
                <label>TC A/C al cierre
                  <input type="number" value={closeTcAc} onChange={e => setCloseTcAc(Number(e.target.value))} required />
                </label>
              </div>
              <div className="form-row">
                <label>TSN/TSO al cierre
                  <input type="number" value={closeTsnTso} onChange={e => setCloseTsnTso(Number(e.target.value))} required />
                </label>
                <label>CSN/CSO al cierre
                  <input type="number" value={closeCsnCso} onChange={e => setCloseCsnCso(Number(e.target.value))} required />
                </label>
              </div>
              <label>Referencia OMA / Certificación
                <textarea rows={3} value={closeOmaCertRef} onChange={e => setCloseOmaCertRef(e.target.value)} placeholder="Referencia de certificación OMA..." />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Cerrar OT e Imprimir</button>
                <button type="button" className="btn-secondary" onClick={() => setCloseWO(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tabla de órdenes ──────────────────────────────────────────────── */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° OT</th>
              <th>Aeronave</th>
              <th>Componente</th>
              <th>Dirigida a</th>
              <th>Prioridad</th>
              <th>F. Proyectada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(wo => (
              <tr key={wo.id}>
                <td data-label="N° OT"><strong>{wo.workOrderNumber}</strong></td>
                <td data-label="Aeronave">{wo.aircraftRegistration}</td>
                <td data-label="Componente">{wo.componentDesc}</td>
                <td data-label="Dirigida a">{wo.directedTo}</td>
                <td data-label="Prioridad">
                  <span className={`badge priority-${wo.priority}`}>
                    {wo.priority === 'low' ? 'Baja' : wo.priority === 'medium' ? 'Media' : wo.priority === 'high' ? 'Alta' : 'Crítica'}
                  </span>
                </td>
                <td data-label="F. Proyectada">{wo.projectedDate}</td>
                <td data-label="Estado">
                  <span className={`badge status-${wo.status}`}>
                    {wo.status === 'pending' ? 'Pendiente' : wo.status === 'in_progress' ? 'En Progreso' : wo.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </td>
                <td data-label="Acciones">
                  <div className="actions-cell">
                    <button className="btn-icon sm" onClick={() => printMCM002(wo)} title="Imprimir MCM-002" aria-label="Imprimir">
                      <Icon name="print" size={15} />
                    </button>
                    {puedeEditar && (
                      <button className="btn-icon sm edit" onClick={() => openEdit(wo)} title="Editar" aria-label="Editar">
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                    {puedeEditar && wo.status === 'pending' && (
                      <button
                        className="btn-icon sm info"
                        title="Iniciar"
                        aria-label="Iniciar"
                        onClick={() => {
                          updateWorkOrder(wo.id, { status: 'in_progress' });
                          logAudit({ module: 'oma', action: 'status', user: user?.username || '', description: `Inició la orden ${wo.workOrderNumber}`, reference: wo.workOrderNumber });
                        }}
                      >
                        <Icon name="play" size={15} />
                      </button>
                    )}
                    {puedeEditar && wo.status === 'in_progress' && (
                      <button className="btn-icon sm ok" onClick={() => openCloseModal(wo)} title="Completar" aria-label="Completar">
                        <Icon name="check" size={15} />
                      </button>
                    )}
                    {puedeEditar && (wo.status === 'pending' || wo.status === 'in_progress') && (
                      <button
                        className="btn-icon sm warn"
                        title="Cancelar orden"
                        aria-label="Cancelar orden"
                        onClick={() => {
                          updateWorkOrder(wo.id, { status: 'cancelled' });
                          logAudit({ module: 'oma', action: 'status', user: user?.username || '', description: `Canceló la orden ${wo.workOrderNumber}`, reference: wo.workOrderNumber });
                        }}
                      >
                        <Icon name="x" size={15} />
                      </button>
                    )}
                    {puedeEliminar && (
                      <button className="btn-icon sm delete" onClick={() => handleDelete(wo)} title="Eliminar" aria-label="Eliminar">
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan={8} className="table-empty">No se encontraron órdenes de trabajo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={pg.page} totalPages={pg.totalPages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
    </div>
  );
};

export default OMA;
