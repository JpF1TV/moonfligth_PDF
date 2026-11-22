import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useOperations } from '../context/OperationsContext';
import { useEngineering } from '../context/EngineeringContext';
import { useOMA } from '../context/OMAContext';
import { useTickets } from '../context/TicketContext';
import { useAudit, AUDIT_MODULE_LABEL } from '../context/AuditContext';
import ModuleIcon, { ModuleIconName } from '../components/ModuleIcon';
import Icon from '../components/Icon';
import { DonutChart, BarChart } from '../components/Charts';
import './Dashboard.css';

interface Metric {
  label: string;
  value: number | string;
  icon: ModuleIconName;
  accent: string;
  to: string;
  hint?: string;
  highlight?: boolean;
}

interface QuickAction {
  label: string;
  to: string;
  icon: ModuleIconName;
  roles: string[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { parts, requests } = useData();
  const { aircraft, pilots, flightLogs } = useOperations();
  const { components } = useEngineering();
  const { workOrders } = useOMA();
  const { tickets } = useTickets();
  const { audit } = useAudit();

  // ── Cálculos ──────────────────────────────────────────────────────────
  const allItems = parts.flatMap(p => p.items);
  const availableItems = allItems.filter(i => i.status === 'available').length;
  const overhaulItems = allItems.filter(i => i.status === 'overhaul').length;
  const outItems = allItems.filter(i => i.status === 'out').length;
  const reservedItems = allItems.filter(i => i.status === 'reserved').length;

  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const pendingWO = workOrders.filter(w => w.status === 'pending').length;
  const inProgressWO = workOrders.filter(w => w.status === 'in_progress').length;

  const alertComponents = components.filter(c => c.status === 'alert').length;
  const overdueComponents = components.filter(c => c.status === 'overdue').length;

  const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;

  const now = new Date();
  const flightsThisMonth = flightLogs.filter(l => {
    const d = new Date(l.createdDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Vuelos de los últimos 6 meses
  const flightsByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const value = flightLogs.filter(l => {
      const f = new Date(l.createdDate);
      return f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear();
    }).length;
    return { label: MONTHS[d.getMonth()], value };
  });

  const inventoryData = [
    { label: 'Disponible', value: availableItems, color: '#22c55e' },
    { label: 'Overhaul', value: overhaulItems, color: '#f59e0b' },
    { label: 'Salida', value: outItems, color: '#ef4444' },
    { label: 'Reservado', value: reservedItems, color: '#3b82f6' },
  ];

  // ── Tarjetas de métricas ──────────────────────────────────────────────
  const metrics: Metric[] = [
    { label: 'Piezas disponibles', value: availableItems, icon: 'almacen', accent: 'blue', to: '/almacen', hint: `${allItems.length} en total` },
    { label: 'En overhaul', value: overhaulItems, icon: 'mantenimiento', accent: 'amber', to: '/almacen' },
    { label: 'Solicitudes pendientes', value: pendingRequests, icon: 'oma', accent: 'violet', to: user?.role === 'admin' ? '/admin-panel' : '/mantenimiento', highlight: pendingRequests > 0 },
    { label: 'Órdenes de trabajo', value: pendingWO + inProgressWO, icon: 'oma', accent: 'cyan', to: '/oma', hint: `${pendingWO} pend · ${inProgressWO} en curso` },
    { label: 'Componentes en alerta', value: alertComponents, icon: 'ingenieria', accent: 'amber', to: '/ingenieria', highlight: alertComponents > 0 },
    { label: 'Componentes vencidos', value: overdueComponents, icon: 'ingenieria', accent: 'red', to: '/ingenieria', highlight: overdueComponents > 0 },
    { label: 'Vuelos este mes', value: flightsThisMonth, icon: 'operaciones', accent: 'blue', to: '/operaciones' },
    { label: 'Tickets abiertos', value: openTickets, icon: 'mantenimiento', accent: 'violet', to: '/mantenimiento' },
  ];

  // ── Accesos rápidos (según rol) ───────────────────────────────────────
  const quickActions: QuickAction[] = [
    { label: 'Nueva solicitud', to: '/mantenimiento', icon: 'mantenimiento', roles: ['requester', 'warehouse', 'admin'] },
    { label: 'Registrar pieza', to: '/almacen', icon: 'almacen', roles: ['warehouse', 'admin'] },
    { label: 'Registrar vuelo', to: '/operaciones', icon: 'operaciones', roles: ['admin'] },
    { label: 'Nueva orden de trabajo', to: '/oma', icon: 'oma', roles: ['admin'] },
    { label: 'Aprobar solicitudes', to: '/admin-panel', icon: 'admin', roles: ['admin'] },
    { label: 'Ver trazabilidad', to: '/historial', icon: 'historial', roles: ['warehouse', 'requester', 'admin'] },
  ].filter(a => a.roles.includes(user?.role || ''));

  const recent = audit.slice(0, 7);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <h1>{greeting}, <span className="dash-user">{user?.username}</span></h1>
          <p>Resumen general del sistema de gestión aeronáutica.</p>
        </div>
        <div className="dash-hero-chips">
          <span className="dash-chip">{aircraft.length} aeronaves</span>
          <span className="dash-chip">{pilots.length} pilotos</span>
        </div>
      </div>

      {/* Alertas destacadas */}
      {(overdueComponents > 0 || pendingRequests > 0) && (
        <div className="dash-alert">
          <span className="dash-alert-dot" />
          <span>
            {overdueComponents > 0 && <strong>{overdueComponents} componente(s) vencido(s). </strong>}
            {pendingRequests > 0 && <>{pendingRequests} solicitud(es) esperan aprobación.</>}
          </span>
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div className="dash-grid">
        {metrics.map(m => (
          <button
            key={m.label}
            className={`dash-card accent-${m.accent} ${m.highlight ? 'is-highlight' : ''}`}
            onClick={() => navigate(m.to)}
          >
            <div className="dash-card-bar" />
            <div className="dash-card-ico"><ModuleIcon name={m.icon} size={22} /></div>
            <div className="dash-card-body">
              <span className="dash-card-value">{m.value}</span>
              <span className="dash-card-label">{m.label}</span>
              {m.hint && <span className="dash-card-hint">{m.hint}</span>}
            </div>
            <span className="dash-card-arrow"><Icon name="arrow-right" size={18} /></span>
          </button>
        ))}
      </div>

      {/* Gráficos */}
      <div className="dash-panels">
        <section className="dash-panel">
          <h3>Inventario por estado</h3>
          {allItems.length === 0
            ? <p className="dash-panel-empty">Aún no hay piezas registradas.</p>
            : <DonutChart data={inventoryData} centerLabel="piezas" />}
        </section>

        <section className="dash-panel">
          <h3>Vuelos por mes</h3>
          {flightLogs.length === 0
            ? <p className="dash-panel-empty">Aún no hay vuelos registrados.</p>
            : <BarChart data={flightsByMonth} />}
        </section>
      </div>

      {/* Accesos rápidos + actividad */}
      <div className="dash-panels">
        <section className="dash-panel">
          <h3>Accesos rápidos</h3>
          <div className="quick-grid">
            {quickActions.map(a => (
              <button key={a.label} className="quick-action" onClick={() => navigate(a.to)}>
                <span className="quick-ico"><ModuleIcon name={a.icon} size={20} /></span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h3>Actividad reciente</h3>
            <button className="dash-link" onClick={() => navigate('/historial')}>Ver todo</button>
          </div>
          {recent.length === 0 ? (
            <p className="dash-panel-empty">La actividad aparecerá aquí a medida que se use el sistema.</p>
          ) : (
            <ul className="activity-feed">
              {recent.map(e => (
                <li key={e.id}>
                  <span className={`audit-badge mod-${e.module}`}>{AUDIT_MODULE_LABEL[e.module]}</span>
                  <div className="activity-text">
                    <span>{e.description}</span>
                    <small>{e.user} · {timeAgo(e.date)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
