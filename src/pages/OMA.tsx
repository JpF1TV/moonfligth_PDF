import React, { useState } from 'react';
import { useOMA } from '../context/OMAContext';
import { useOperations } from '../context/OperationsContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { WorkOrder, WorkOrderPart } from '../types';
import { downloadMCM002PDF } from '../components/MCM002PDF';
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
  const { workOrders, addWorkOrder, updateWorkOrder } = useOMA();
  const { aircraft } = useOperations();
  const { user } = useAuth();
  useData(); // disponible si se necesita inventario

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAircraft, setFilterAircraft] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
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

  // ── Submit creación ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWO: Omit<WorkOrder, 'id' | 'workOrderNumber' | 'createdDate'> = {
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
      type: 'scheduled',
      priority,
      status: 'pending',
      partsRequired: [] as WorkOrderPart[],
      partsAvailable: false,
      createdBy: user?.username || 'admin',
      autoGenerated: false,
    };
    addWorkOrder(newWO);

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
          ⚠️ Hay <strong>{autoGenPending.length}</strong> orden(es) de trabajo generada(s)
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
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva Orden de Trabajo</button>
      </div>

      {/* ── Formulario creación ────────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <h3>Nueva Orden de Trabajo MCM-002</h3>
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
                <button type="submit" className="btn-primary">Crear y Imprimir MCM-002</button>
                <button type="button" className="btn-secondary" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
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
            {filteredOrders.map(wo => (
              <tr key={wo.id}>
                <td>{wo.workOrderNumber}</td>
                <td>{wo.aircraftRegistration}</td>
                <td>{wo.componentDesc}</td>
                <td>{wo.directedTo}</td>
                <td>
                  <span className={`badge priority-${wo.priority}`}>
                    {wo.priority === 'low' ? 'Baja' : wo.priority === 'medium' ? 'Media' : wo.priority === 'high' ? 'Alta' : 'Crítica'}
                  </span>
                </td>
                <td>{wo.projectedDate}</td>
                <td>
                  <span className={`badge status-${wo.status}`}>
                    {wo.status === 'pending' ? 'Pendiente' : wo.status === 'in_progress' ? 'En Progreso' : wo.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn-small" onClick={() => printMCM002(wo)} title="Imprimir MCM-002">🖨️</button>
                  {wo.status === 'pending' && (
                    <button className="btn-small btn-start" onClick={() => updateWorkOrder(wo.id, { status: 'in_progress' })} title="Iniciar">▶️</button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button className="btn-small btn-complete" onClick={() => openCloseModal(wo)} title="Completar">✅</button>
                  )}
                  {(wo.status === 'pending' || wo.status === 'in_progress') && (
                    <button className="btn-small btn-cancel" onClick={() => updateWorkOrder(wo.id, { status: 'cancelled' })} title="Cancelar">❌</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center' }}>No se encontraron órdenes de trabajo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OMA;
