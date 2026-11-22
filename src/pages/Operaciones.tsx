import React, { useState } from 'react';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';
import { FlightLeg } from '../types';
import { canEdit, canDelete } from '../utils/permissions';
import { useAudit } from '../context/AuditContext';
import { useConfirm } from '../context/ConfirmContext';
import ModuleIcon from '../components/ModuleIcon';
import Icon from '../components/Icon';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

type Tab = 'libro' | 'pilotos' | 'aeronaves' | 'informes';

// ── Utilidades de hora militar ──────────────────────────────────────────────
/** Convierte "HHmm" a minutos desde medianoche */
function milToMin(hhmm: string): number {
  if (!hhmm || hhmm.length < 3) return 0;
  const padded = hhmm.padStart(4, '0');
  const h = parseInt(padded.slice(0, 2), 10);
  const m = parseInt(padded.slice(2, 4), 10);
  return h * 60 + m;
}

/** Diferencia en minutos entre dos horas militares (maneja cruce de medianoche) */
function diffMin(start: string, end: string): number {
  let s = milToMin(start);
  let e = milToMin(end);
  if (e < s) e += 24 * 60; // cruce de medianoche
  return e - s;
}

/** Formatea minutos como "HH:MM" */
function minToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Valida que el string sea hora militar válida HHmm */
function isValidMil(v: string): boolean {
  if (!/^\d{3,4}$/.test(v)) return false;
  const padded = v.padStart(4, '0');
  const h = parseInt(padded.slice(0, 2), 10);
  const m = parseInt(padded.slice(2, 4), 10);
  return h < 24 && m < 60;
}

// ── Tipos locales ────────────────────────────────────────────────────────────
interface LegDraft {
  origin: string;
  destination: string;
  blockStart: string;
  flightStart: string;
  flightEnd: string;
  blockEnd: string;
  fuelInitial: string;
  fuelFinal: string;
}

const emptyLeg = (): LegDraft => ({
  origin: '', destination: '',
  blockStart: '', flightStart: '', flightEnd: '', blockEnd: '',
  fuelInitial: '', fuelFinal: '',
});

const emptyHeader = () => ({
  flightNumber: '',
  aircraftId: '',
  pilotId: '',
  hasCoPilot: false,
  coPilotId: '',
  notes: '',
});


const Operaciones: React.FC = () => {
  const { user } = useAuth();
  const { pilots, aircraft, flightLogs, nextRegistroNumber, addPilot, updatePilot, deletePilot, addAircraft, updateAircraft, deleteAircraft, addFlightLog, deleteFlightLog } = useOperations();
  const [tab, setTab] = useState<Tab>('libro');

  const { logAudit } = useAudit();
  const confirm = useConfirm();
  const puedeEditar = canEdit(user, 'operaciones');
  const puedeEliminar = canDelete(user, 'operaciones');

  // ── Estado del formulario de registro ──────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState(emptyHeader());
  const [legs, setLegs] = useState<LegDraft[]>([emptyLeg()]);

  const resetForm = () => {
    setHeader(emptyHeader());
    setLegs([emptyLeg()]);
    setShowForm(false);
  };

  // ── Helpers de trayecto ────────────────────────────────────────────────────
  const updateLeg = (idx: number, field: keyof LegDraft, value: string) => {
    setLegs(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLeg = () => setLegs(prev => [...prev, emptyLeg()]);

  const removeLeg = (idx: number) => {
    if (legs.length === 1) return;
    setLegs(prev => prev.filter((_, i) => i !== idx));
  };

  // Cálculos en tiempo real para un trayecto
  const calcLeg = (l: LegDraft) => {
    const flightMins = (isValidMil(l.flightStart) && isValidMil(l.flightEnd))
      ? diffMin(l.flightStart, l.flightEnd) : 0;
    const blockMins = (isValidMil(l.blockStart) && isValidMil(l.blockEnd))
      ? diffMin(l.blockStart, l.blockEnd) : 0;
    const fi = parseFloat(l.fuelInitial) || 0;
    const ff = parseFloat(l.fuelFinal) || 0;
    const burned = fi > 0 ? Math.max(0, fi - ff) : 0;
    return { flightMins, blockMins, burned };
  };

  const totalFlightMins = legs.reduce((s, l) => s + calcLeg(l).flightMins, 0);
  const totalBlockMins = legs.reduce((s, l) => s + calcLeg(l).blockMins, 0);

  // ── Submit del registro ────────────────────────────────────────────────────
  const submitFlight = (e: React.FormEvent) => {
    e.preventDefault();
    const ac = aircraft.find(a => a.id === header.aircraftId);
    const pilot = pilots.find(p => p.id === header.pilotId);
    const coPilot = header.hasCoPilot ? pilots.find(p => p.id === header.coPilotId) : undefined;
    if (!ac || !pilot) return;

    const builtLegs: FlightLeg[] = legs.map((l, idx) => {
      const { flightMins, blockMins, burned } = calcLeg(l);
      return {
        id: `${Date.now()}-${idx}`,
        legNumber: idx + 1,
        origin: l.origin.toUpperCase(),
        destination: l.destination.toUpperCase(),
        blockStart: l.blockStart,
        flightStart: l.flightStart,
        flightEnd: l.flightEnd,
        blockEnd: l.blockEnd,
        fuelInitial: parseFloat(l.fuelInitial) || 0,
        fuelFinal: parseFloat(l.fuelFinal) || 0,
        fuelBurned: burned,
        cycle: idx + 1,
        rin: idx + 1,
        flightMinutes: flightMins,
        blockMinutes: blockMins,
      };
    });

    logAudit({ module: 'operaciones', action: 'create', user: user?.username || '', description: `Registró vuelo N° ${nextRegistroNumber} (${ac.registration}, ${pilot.name})`, reference: String(nextRegistroNumber) });
    addFlightLog({
      registroNumber: nextRegistroNumber,
      flightNumber: header.flightNumber,
      aircraftId: ac.id,
      aircraftRegistration: ac.registration,
      pilotId: pilot.id,
      pilotName: pilot.name,
      hasCoPilot: header.hasCoPilot,
      coPilotId: coPilot?.id,
      coPilotName: coPilot?.name,
      legs: builtLegs,
      totalFlightMinutes: totalFlightMins,
      totalBlockMinutes: totalBlockMins,
      clientMinutes: totalFlightMins,
      totalCycles: builtLegs.length,
      notes: header.notes,
      createdBy: user?.username || '',
      createdDate: new Date().toISOString(),
    });
    resetForm();
  };


  // ── Pilotos ─────────────────────────────────────────────────────────────────
  const [showPilotForm, setShowPilotForm] = useState(false);
  const [editPilotId, setEditPilotId] = useState<string | null>(null);
  const [pilotForm, setPilotForm] = useState({ name: '', licenseNumber: '', email: '', phone: '' });

  const submitPilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPilotId) {
      updatePilot(editPilotId, {
        name: pilotForm.name,
        licenseNumber: pilotForm.licenseNumber,
        email: pilotForm.email,
        phone: pilotForm.phone,
      });
      logAudit({ module: 'operaciones', action: 'update', user: user?.username || '', description: `Editó el piloto ${pilotForm.name}` });
    } else {
      addPilot({ ...pilotForm, isActive: true, totalBlockHours: 0, totalFlightHours: 0, totalCycles: 0 });
      logAudit({ module: 'operaciones', action: 'create', user: user?.username || '', description: `Agregó el piloto ${pilotForm.name}` });
    }
    setPilotForm({ name: '', licenseNumber: '', email: '', phone: '' });
    setEditPilotId(null);
    setShowPilotForm(false);
  };

  const startEditPilot = (id: string) => {
    const p = pilots.find(x => x.id === id);
    if (!p) return;
    setEditPilotId(id);
    setPilotForm({ name: p.name, licenseNumber: p.licenseNumber, email: p.email || '', phone: p.phone || '' });
    setShowPilotForm(true);
  };

  const handleDeletePilot = async (id: string, name: string) => {
    const ok = await confirm({ danger: true, title: 'Eliminar piloto', message: `Se eliminará al piloto "${name}". Esta acción no se puede deshacer.` });
    if (ok) {
      deletePilot(id);
      logAudit({ module: 'operaciones', action: 'delete', user: user?.username || '', description: `Eliminó al piloto ${name}` });
    }
  };

  // ── Aeronaves ───────────────────────────────────────────────────────────────
  const [showAcForm, setShowAcForm] = useState(false);
  const [editAcId, setEditAcId] = useState<string | null>(null);
  const [acForm, setAcForm] = useState({ registration: '', model: '', serialNumber: '', totalHours: '', totalCycles: '' });

  const submitAircraft = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      registration: acForm.registration, model: acForm.model, serialNumber: acForm.serialNumber,
      totalHours: parseFloat(acForm.totalHours) || 0,
      totalCycles: parseInt(acForm.totalCycles) || 0,
    };
    if (editAcId) {
      updateAircraft(editAcId, payload);
      logAudit({ module: 'operaciones', action: 'update', user: user?.username || '', description: `Editó la aeronave ${payload.registration}`, reference: payload.registration });
    } else {
      addAircraft({ ...payload, isActive: true });
      logAudit({ module: 'operaciones', action: 'create', user: user?.username || '', description: `Agregó la aeronave ${payload.registration}`, reference: payload.registration });
    }
    setAcForm({ registration: '', model: '', serialNumber: '', totalHours: '', totalCycles: '' });
    setEditAcId(null);
    setShowAcForm(false);
  };

  const startEditAircraft = (id: string) => {
    const a = aircraft.find(x => x.id === id);
    if (!a) return;
    setEditAcId(id);
    setAcForm({
      registration: a.registration, model: a.model, serialNumber: a.serialNumber,
      totalHours: String(a.totalHours), totalCycles: String(a.totalCycles),
    });
    setShowAcForm(true);
  };

  const handleDeleteAircraft = async (id: string, reg: string) => {
    const ok = await confirm({ danger: true, title: 'Eliminar aeronave', message: `Se eliminará la aeronave "${reg}". Esta acción no se puede deshacer.` });
    if (ok) {
      deleteAircraft(id);
      logAudit({ module: 'operaciones', action: 'delete', user: user?.username || '', description: `Eliminó la aeronave ${reg}`, reference: reg });
    }
  };

  // ── Vuelos ──────────────────────────────────────────────────────────────────
  const handleDeleteFlight = async (id: string, regNum: number) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar registro de vuelo',
      message: `Se eliminará el registro de vuelo N° ${regNum}. Las horas ya acumuladas en el piloto y la aeronave no se revierten automáticamente.`,
    });
    if (ok) {
      deleteFlightLog(id);
      logAudit({ module: 'operaciones', action: 'delete', user: user?.username || '', description: `Eliminó el registro de vuelo N° ${regNum}`, reference: String(regNum) });
    }
  };

  // ── Informes ────────────────────────────────────────────────────────────────
  const [filterPilot, setFilterPilot] = useState('');

  const filteredLogs = flightLogs.filter(l => !filterPilot || l.pilotId === filterPilot);

  // ── Paginación ──────────────────────────────────────────────────────────────
  const pilotsPg = usePagination(pilots, 10);
  const aircraftPg = usePagination(aircraft, 10);
  const logsPg = usePagination(filteredLogs, 10);


  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="operaciones" size={22} /> Operaciones</h2>
      </div>

      <div className="tabs">
        {(['libro', 'pilotos', 'aeronaves', 'informes'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'libro' ? 'Libro de Vuelo' : t === 'pilotos' ? 'Pilotos' : t === 'aeronaves' ? 'Aeronaves' : 'Informes'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LIBRO DE VUELO
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'libro' && (
        <div>
          <div className="header-actions" style={{ marginBottom: 20 }}>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Icon name="plus" size={15} /> Registrar Vuelo
            </button>
          </div>

          <Drawer
            open={showForm}
            wide
            title={`Nuevo Registro de Vuelo · N° ${nextRegistroNumber}`}
            onClose={resetForm}
          >
            <form className="form-card" onSubmit={submitFlight} style={{ maxWidth: '100%' }}>
              {/* ── Encabezado ── */}
              <div className="flight-block">
                <h4 className="flight-block-title">Datos del Vuelo</h4>
                <div className="form-grid">
                  <div>
                    <label style={labelStyle}>N° Vuelo (libro físico)</label>
                    <input
                      style={inputStyle}
                      placeholder="Ej: 2024-001"
                      value={header.flightNumber}
                      onChange={e => setHeader(p => ({ ...p, flightNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Aeronave (matrícula)</label>
                    <select
                      style={inputStyle}
                      value={header.aircraftId}
                      onChange={e => setHeader(p => ({ ...p, aircraftId: e.target.value }))}
                      required
                    >
                      <option value="">Seleccionar aeronave</option>
                      {aircraft.filter(a => a.isActive).map(a => (
                        <option key={a.id} value={a.id}>{a.registration} — {a.model}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Piloto al mando</label>
                    <select
                      style={inputStyle}
                      value={header.pilotId}
                      onChange={e => setHeader(p => ({ ...p, pilotId: e.target.value }))}
                      required
                    >
                      <option value="">Seleccionar piloto</option>
                      {pilots.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Copiloto toggle */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-soft)' }}>
                    <input
                      type="checkbox"
                      checked={header.hasCoPilot}
                      onChange={e => setHeader(p => ({ ...p, hasCoPilot: e.target.checked, coPilotId: '' }))}
                      style={{ width: 16, height: 16 }}
                    />
                    Aplica copiloto
                  </label>
                </div>
                {header.hasCoPilot && (
                  <div style={{ marginTop: 10, maxWidth: 320 }}>
                    <label style={labelStyle}>Copiloto</label>
                    <select
                      style={inputStyle}
                      value={header.coPilotId}
                      onChange={e => setHeader(p => ({ ...p, coPilotId: e.target.value }))}
                      required={header.hasCoPilot}
                    >
                      <option value="">Seleccionar copiloto</option>
                      {pilots.filter(p => p.isActive && p.id !== header.pilotId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


              {/* ── Trayectos ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, color: 'var(--text-soft)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Trayectos del día
                  </h4>
                  <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={addLeg}>
                    + Agregar trayecto
                  </button>
                </div>

                {legs.map((leg, idx) => {
                  const { flightMins, blockMins, burned } = calcLeg(leg);
                  return (
                    <div key={idx} style={legCardStyle}>
                      {/* Encabezado del trayecto */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: 14 }}>
                          Trayecto {idx + 1} &nbsp;
                          <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>
                            Ciclo {idx + 1} · RIN {idx + 1}
                          </span>
                        </span>
                        {legs.length > 1 && (
                          <button type="button" onClick={() => removeLeg(idx)} style={removeBtnStyle}>✕ Eliminar</button>
                        )}
                      </div>

                      {/* Origen / Destino */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>Origen (ICAO)</label>
                          <input style={inputStyle} placeholder="SKBO" value={leg.origin}
                            onChange={e => updateLeg(idx, 'origin', e.target.value)} required />
                        </div>
                        <div>
                          <label style={labelStyle}>Destino (ICAO)</label>
                          <input style={inputStyle} placeholder="SKRG" value={leg.destination}
                            onChange={e => updateLeg(idx, 'destination', e.target.value)} required />
                        </div>
                      </div>

                      {/* Tiempos en hora militar */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>Inicio Bloque</label>
                          <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 2 }}
                            placeholder="0830" maxLength={4} value={leg.blockStart}
                            onChange={e => updateLeg(idx, 'blockStart', e.target.value.replace(/\D/g, ''))}
                            required />
                        </div>
                        <div>
                          <label style={labelStyle}>Inicio Vuelo</label>
                          <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 2 }}
                            placeholder="0845" maxLength={4} value={leg.flightStart}
                            onChange={e => updateLeg(idx, 'flightStart', e.target.value.replace(/\D/g, ''))}
                            required />
                        </div>
                        <div>
                          <label style={labelStyle}>Termina Vuelo</label>
                          <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 2 }}
                            placeholder="1015" maxLength={4} value={leg.flightEnd}
                            onChange={e => updateLeg(idx, 'flightEnd', e.target.value.replace(/\D/g, ''))}
                            required />
                        </div>
                        <div>
                          <label style={labelStyle}>Fin Bloque</label>
                          <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 2 }}
                            placeholder="1025" maxLength={4} value={leg.blockEnd}
                            onChange={e => updateLeg(idx, 'blockEnd', e.target.value.replace(/\D/g, ''))}
                            required />
                        </div>
                      </div>

                      {/* Combustible */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                        <div>
                          <label style={labelStyle}>Combustible inicial (gal)</label>
                          <input style={inputStyle} type="number" step="0.1" placeholder="0.0" value={leg.fuelInitial}
                            onChange={e => updateLeg(idx, 'fuelInitial', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>Combustible final (gal)</label>
                          <input style={inputStyle} type="number" step="0.1" placeholder="0.0" value={leg.fuelFinal}
                            onChange={e => updateLeg(idx, 'fuelFinal', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>Combustible gastado</label>
                          <div style={inputStyle} className="field-readonly">
                            {burned > 0 ? `${burned.toFixed(1)} gal` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Resumen del trayecto */}
                      <div className="flight-summary">
                        <span>Vuelo: <strong>{flightMins > 0 ? minToHHMM(flightMins) : '—'}</strong></span>
                        <span>Bloque: <strong>{blockMins > 0 ? minToHHMM(blockMins) : '—'}</strong></span>
                        <span>Ciclo: <strong>{idx + 1}</strong></span>
                        <span>RIN: <strong>{idx + 1}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>


              {/* ── Totales del registro ── */}
              <div className="flight-totals">
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Tiempo de Vuelo Total</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{totalFlightMins > 0 ? minToHHMM(totalFlightMins) : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Tiempo Bloque Total</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{totalBlockMins > 0 ? minToHHMM(totalBlockMins) : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Tiempo Cliente</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{totalFlightMins > 0 ? minToHHMM(totalFlightMins) : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Total Ciclos</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{legs.length}</div>
                </div>
              </div>

              {/* Notas */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Notas (opcional)</label>
                <input style={inputStyle} placeholder="Observaciones del vuelo..."
                  value={header.notes} onChange={e => setHeader(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Registro</button>
              </div>
            </form>
          </Drawer>

          {/* ── Tabla de registros ── */}
          {flightLogs.length === 0 ? (
            <EmptyState
              title="No hay vuelos registrados aún"
              hint="Registra el primer vuelo para empezar a acumular horas y ciclos."
              action={{ label: 'Registrar el primer vuelo', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div>
              {flightLogs.map(log => (
                <div key={log.id} className="flight-card">
                  {/* Encabezado del registro */}
                  <div className="flight-card-head">
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Reg. N° {log.registroNumber}</span>
                    <span>Vuelo: <strong>{log.flightNumber}</strong></span>
                    <span>{log.aircraftRegistration}</span>
                    <span>{log.pilotName}{log.hasCoPilot && log.coPilotName ? ` / ${log.coPilotName}` : ''}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>
                      {new Date(log.createdDate).toLocaleDateString('es-CO')}
                    </span>
                  </div>

                  {/* Trayectos */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Tray.</th>
                          <th style={thStyle}>Origen</th>
                          <th style={thStyle}>Destino</th>
                          <th style={thStyle}>Ini. Bloque</th>
                          <th style={thStyle}>Ini. Vuelo</th>
                          <th style={thStyle}>Fin Vuelo</th>
                          <th style={thStyle}>Fin Bloque</th>
                          <th style={thStyle}>T. Vuelo</th>
                          <th style={thStyle}>T. Bloque</th>
                          <th style={thStyle}>Comb. Ini.</th>
                          <th style={thStyle}>Comb. Fin.</th>
                          <th style={thStyle}>Comb. Gast.</th>
                          <th style={thStyle}>Ciclo</th>
                          <th style={thStyle}>RIN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.legs.map(leg => (
                          <tr key={leg.id}>
                            <td style={tdStyle}>{leg.legNumber}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{leg.origin}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{leg.destination}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{leg.blockStart}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{leg.flightStart}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{leg.flightEnd}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{leg.blockEnd}</td>
                            <td style={tdStyle}>{minToHHMM(leg.flightMinutes)}</td>
                            <td style={tdStyle}>{minToHHMM(leg.blockMinutes)}</td>
                            <td style={tdStyle}>{leg.fuelInitial > 0 ? `${leg.fuelInitial.toFixed(1)}` : '—'}</td>
                            <td style={tdStyle}>{leg.fuelFinal > 0 ? `${leg.fuelFinal.toFixed(1)}` : '—'}</td>
                            <td style={{ ...tdStyle, color: leg.fuelBurned > 0 ? 'var(--danger)' : 'var(--text-faint)' }}>
                              {leg.fuelBurned > 0 ? `${leg.fuelBurned.toFixed(1)}` : '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{leg.cycle}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{leg.rin}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales del registro */}
                  <div className="flight-card-foot">
                    <span><strong>T. Vuelo:</strong> {minToHHMM(log.totalFlightMinutes)}</span>
                    <span><strong>T. Bloque:</strong> {minToHHMM(log.totalBlockMinutes)}</span>
                    <span><strong>T. Cliente:</strong> {minToHHMM(log.clientMinutes)}</span>
                    <span><strong>Ciclos:</strong> {log.totalCycles}</span>
                    {log.notes && <span style={{ color: 'var(--text-faint)' }}>Nota: {log.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════════
          PILOTOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'pilotos' && (
        <div>
          <div className="header-actions" style={{ marginBottom: 20 }}>
            {puedeEditar && (
              <button className="btn-primary" onClick={() => {
                setPilotForm({ name: '', licenseNumber: '', email: '', phone: '' });
                setEditPilotId(null);
                setShowPilotForm(true);
              }}>
                <Icon name="plus" size={15} /> Agregar Piloto
              </button>
            )}
          </div>
          {puedeEditar && (
          <Drawer
            open={showPilotForm}
            title={editPilotId ? 'Editar Piloto' : 'Nuevo Piloto'}
            onClose={() => { setPilotForm({ name: '', licenseNumber: '', email: '', phone: '' }); setEditPilotId(null); setShowPilotForm(false); }}
          >
            <form className="form-card" onSubmit={submitPilot}>
              <div className="form-grid">
                <input placeholder="Nombre completo" value={pilotForm.name} onChange={e => setPilotForm(p => ({ ...p, name: e.target.value }))} required />
                <input placeholder="N° Licencia" value={pilotForm.licenseNumber} onChange={e => setPilotForm(p => ({ ...p, licenseNumber: e.target.value }))} required />
                <input placeholder="Email" value={pilotForm.email} onChange={e => setPilotForm(p => ({ ...p, email: e.target.value }))} />
                <input placeholder="Teléfono" value={pilotForm.phone} onChange={e => setPilotForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </Drawer>
          )}
          {pilots.length === 0 ? (
            <EmptyState
              title="No hay pilotos registrados"
              hint="Agrega pilotos para poder asignarlos a los registros de vuelo."
              action={puedeEditar ? { label: 'Agregar el primer piloto', onClick: () => setShowPilotForm(true) } : undefined}
            />
          ) : (
          <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Licencia</th><th>Horas Bloque</th><th>Horas Vuelo</th><th>Ciclos</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pilotsPg.pageItems.map(p => (
                  <tr key={p.id}>
                    <td data-label="Nombre"><strong>{p.name}</strong></td>
                    <td data-label="Licencia">{p.licenseNumber}</td>
                    <td data-label="Horas bloque">{p.totalBlockHours.toFixed(1)} h</td>
                    <td data-label="Horas vuelo">{p.totalFlightHours.toFixed(1)} h</td>
                    <td data-label="Ciclos">{p.totalCycles}</td>
                    <td data-label="Estado"><span className={`status ${p.isActive ? 'status-approved' : 'status-rejected'}`}>{p.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        {puedeEditar && (
                          <button className="btn-soft btn-soft-warn" onClick={() => updatePilot(p.id, { isActive: !p.isActive })}>
                            {p.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {puedeEditar && (
                          <button className="btn-icon sm edit" onClick={() => startEditPilot(p.id)} title="Editar" aria-label="Editar">
                            <Icon name="edit" size={15} />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button className="btn-icon sm delete" onClick={() => handleDeletePilot(p.id, p.name)} title="Eliminar" aria-label="Eliminar">
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                        {!puedeEditar && !puedeEliminar && <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={pilotsPg.page} totalPages={pilotsPg.totalPages} total={pilotsPg.total} pageSize={pilotsPg.pageSize} onChange={pilotsPg.setPage} />
          </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          AERONAVES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'aeronaves' && (
        <div>
          <div className="header-actions" style={{ marginBottom: 20 }}>
            {puedeEditar && (
              <button className="btn-primary" onClick={() => {
                setAcForm({ registration: '', model: '', serialNumber: '', totalHours: '', totalCycles: '' });
                setEditAcId(null);
                setShowAcForm(true);
              }}>
                <Icon name="plus" size={15} /> Agregar Aeronave
              </button>
            )}
          </div>
          {puedeEditar && (
          <Drawer
            open={showAcForm}
            title={editAcId ? 'Editar Aeronave' : 'Nueva Aeronave'}
            onClose={() => { setAcForm({ registration: '', model: '', serialNumber: '', totalHours: '', totalCycles: '' }); setEditAcId(null); setShowAcForm(false); }}
          >
            <form className="form-card" onSubmit={submitAircraft}>
              <div className="form-grid">
                <input placeholder="Matrícula (ej: HK-1234)" value={acForm.registration} onChange={e => setAcForm(p => ({ ...p, registration: e.target.value }))} required />
                <input placeholder="Modelo" value={acForm.model} onChange={e => setAcForm(p => ({ ...p, model: e.target.value }))} required />
                <input placeholder="N° Serie" value={acForm.serialNumber} onChange={e => setAcForm(p => ({ ...p, serialNumber: e.target.value }))} required />
                <input type="number" placeholder="Horas totales actuales" value={acForm.totalHours} onChange={e => setAcForm(p => ({ ...p, totalHours: e.target.value }))} />
                <input type="number" placeholder="Ciclos totales actuales" value={acForm.totalCycles} onChange={e => setAcForm(p => ({ ...p, totalCycles: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </Drawer>
          )}
          {aircraft.length === 0 ? (
            <EmptyState
              title="No hay aeronaves registradas"
              hint="Agrega una aeronave para poder registrar vuelos y componentes."
              action={puedeEditar ? { label: 'Agregar la primera aeronave', onClick: () => setShowAcForm(true) } : undefined}
            />
          ) : (
          <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Matrícula</th><th>Modelo</th><th>N° Serie</th><th>Horas Totales</th><th>Ciclos Totales</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {aircraftPg.pageItems.map(a => (
                  <tr key={a.id}>
                    <td data-label="Matrícula"><strong>{a.registration}</strong></td>
                    <td data-label="Modelo">{a.model}</td>
                    <td data-label="N° serie">{a.serialNumber}</td>
                    <td data-label="Horas totales">{a.totalHours.toFixed(1)} h</td>
                    <td data-label="Ciclos totales">{a.totalCycles}</td>
                    <td data-label="Estado"><span className={`status ${a.isActive ? 'status-approved' : 'status-rejected'}`}>{a.isActive ? 'Activa' : 'Inactiva'}</span></td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        {puedeEditar && (
                          <button className="btn-soft btn-soft-warn" onClick={() => updateAircraft(a.id, { isActive: !a.isActive })}>
                            {a.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {puedeEditar && (
                          <button className="btn-icon sm edit" onClick={() => startEditAircraft(a.id)} title="Editar" aria-label="Editar">
                            <Icon name="edit" size={15} />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button className="btn-icon sm delete" onClick={() => handleDeleteAircraft(a.id, a.registration)} title="Eliminar" aria-label="Eliminar">
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                        {!puedeEditar && !puedeEliminar && <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={aircraftPg.page} totalPages={aircraftPg.totalPages} total={aircraftPg.total} pageSize={aircraftPg.pageSize} onChange={aircraftPg.setPage} />
          </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INFORMES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'informes' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <select value={filterPilot} onChange={e => setFilterPilot(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 220 }}>
              <option value="">Todos los pilotos</option>
              {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <h3 style={{ marginBottom: 16, color: 'var(--text-strong)' }}>Resumen por Piloto</h3>
          <div className="table-container" style={{ marginBottom: 30 }}>
            <table>
              <thead>
                <tr><th>Piloto</th><th>Licencia</th><th>Horas Bloque</th><th>Horas Vuelo</th><th>Ciclos</th><th>Registros</th></tr>
              </thead>
              <tbody>
                {pilots.filter(p => !filterPilot || p.id === filterPilot).map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.licenseNumber}</td>
                    <td><strong>{p.totalBlockHours.toFixed(1)} h</strong></td>
                    <td>{p.totalFlightHours.toFixed(1)} h</td>
                    <td>{p.totalCycles}</td>
                    <td>{flightLogs.filter(l => l.pilotId === p.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginBottom: 16, color: 'var(--text-strong)' }}>Registros de Vuelo</h3>
          {filteredLogs.length === 0 ? (
            <EmptyState title="No hay registros con los filtros seleccionados" hint="Cambia el piloto del filtro o registra un vuelo nuevo." />
          ) : (
            <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Reg. N°</th><th>N° Vuelo</th><th>Aeronave</th><th>Piloto</th>
                    <th>Trayectos</th><th>T. Vuelo</th><th>T. Bloque</th><th>T. Cliente</th><th>Ciclos</th><th>Fecha</th>
                    {puedeEliminar && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {logsPg.pageItems.map(l => (
                    <tr key={l.id}>
                      <td data-label="Reg. N°"><strong>{l.registroNumber}</strong></td>
                      <td data-label="N° vuelo">{l.flightNumber}</td>
                      <td data-label="Aeronave">{l.aircraftRegistration}</td>
                      <td data-label="Piloto">{l.pilotName}</td>
                      <td data-label="Trayectos" style={{ textAlign: 'center' }}>{l.legs.length}</td>
                      <td data-label="T. vuelo">{minToHHMM(l.totalFlightMinutes)}</td>
                      <td data-label="T. bloque">{minToHHMM(l.totalBlockMinutes)}</td>
                      <td data-label="T. cliente"><strong>{minToHHMM(l.clientMinutes)}</strong></td>
                      <td data-label="Ciclos" style={{ textAlign: 'center' }}>{l.totalCycles}</td>
                      <td data-label="Fecha">{new Date(l.createdDate).toLocaleDateString('es-CO')}</td>
                      {puedeEliminar && (
                        <td data-label="Acciones">
                          <button className="btn-icon sm delete" onClick={() => handleDeleteFlight(l.id, l.registroNumber)} title="Eliminar" aria-label="Eliminar">
                            <Icon name="trash" size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={logsPg.page} totalPages={logsPg.totalPages} total={logsPg.total} pageSize={logsPg.pageSize} onChange={logsPg.setPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
};


// ── Estilos inline reutilizables ─────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-soft)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  background: 'var(--bg-input)',
  color: 'var(--text-main)',
};

const legCardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  boxShadow: 'var(--shadow-sm)',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--danger)',
  color: 'var(--danger)',
  borderRadius: 4,
  padding: '3px 10px',
  fontSize: 12,
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-soft)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--text-main)',
  whiteSpace: 'nowrap',
};

export default Operaciones;
