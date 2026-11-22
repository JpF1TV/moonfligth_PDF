import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAudit, AUDIT_MODULE_LABEL, AUDIT_ACTION_LABEL, AuditModule } from '../context/AuditContext';
import ModuleIcon from '../components/ModuleIcon';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { Pager, usePagination } from '../components/Pager';
import './Pages.css';

const Historial: React.FC = () => {
  const { history } = useData();
  const { audit } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<'almacen' | 'auditoria'>('almacen');
  const [filter, setFilter] = useState('');

  // Auditoría general
  const [auditModule, setAuditModule] = useState<'all' | AuditModule>('all');
  const [auditSearch, setAuditSearch] = useState('');

  const filteredHistory = history.filter(entry =>
    entry.partNumber.toLowerCase().includes(filter.toLowerCase()) ||
    (entry.serialNumber && entry.serialNumber.toLowerCase().includes(filter.toLowerCase()))
  );

  const filteredAudit = audit.filter(e =>
    (auditModule === 'all' || e.module === auditModule) &&
    (auditSearch === '' ||
      e.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      e.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (e.reference || '').toLowerCase().includes(auditSearch.toLowerCase()))
  );

  const historyPg = usePagination(filteredHistory, 12);
  const auditPg = usePagination(filteredAudit, 12);

  const auditModules: ('all' | AuditModule)[] = ['all', 'almacen', 'solicitudes', 'oma', 'operaciones', 'ingenieria', 'mantenimiento', 'usuarios'];

  // Filtrar historial de las últimas 24 horas
  const getLast24HoursHistory = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return history.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= twentyFourHoursAgo;
    });
  };

  const downloadPDF = () => {
    const last24Hours = getLast24HoursHistory();
    
    if (last24Hours.length === 0) {
      toast.warning('No hay movimientos en las últimas 24 horas');
      return;
    }

    // Crear contenido HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Historial KRONAIR - Últimas 24 Horas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #2c3e50;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e3a5f;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e3a5f;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #7f8c8d;
            margin: 5px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #1e3a5f;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          .action-entry { color: #27ae60; font-weight: bold; }
          .action-exit { color: #e74c3c; font-weight: bold; }
          .action-overhaul { color: #f39c12; font-weight: bold; }
          .action-overhaul_return { color: #3498db; font-weight: bold; }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #7f8c8d;
            font-size: 10px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:10px;">
            <svg width="60" height="60" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="400" cy="300" r="200" fill="#1e3a5f"/>
              <circle cx="440" cy="300" r="180" fill="#f5f5f5"/>
              <g transform="translate(250, 200)">
                <ellipse cx="200" cy="100" rx="180" ry="35" fill="white" stroke="#1e3a5f" stroke-width="4"/>
                <path d="M 100 85 L 50 50 L 350 50 L 300 85 Z" fill="white" stroke="#1e3a5f" stroke-width="3"/>
                <path d="M 100 115 L 50 150 L 350 150 L 300 115 Z" fill="white" stroke="#1e3a5f" stroke-width="3"/>
                <path d="M 20 100 L 0 70 L 40 100 L 0 130 Z" fill="#1e3a5f"/>
                <circle cx="280" cy="100" r="12" fill="#1e3a5f"/>
                <circle cx="250" cy="100" r="12" fill="#1e3a5f"/>
                <circle cx="220" cy="100" r="12" fill="#1e3a5f"/>
                <circle cx="190" cy="100" r="12" fill="#1e3a5f"/>
                <circle cx="160" cy="100" r="12" fill="#1e3a5f"/>
                <ellipse cx="350" cy="100" rx="30" ry="25" fill="#1e3a5f"/>
              </g>
            </svg>
            <h1>KRONAIR</h1>
          </div>
          <h2>Historial de Movimientos</h2>
          <p>Últimas 24 Horas</p>
          <p>Generado: ${new Date().toLocaleString('es-MX')}</p>
          <p>Total de movimientos: ${last24Hours.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Acción</th>
              <th>Número de Serie</th>
              <th>Número de Parte</th>
              <th>Cantidad</th>
              <th>Usuario</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${last24Hours.map(entry => `
              <tr>
                <td>${new Date(entry.date).toLocaleString('es-MX')}</td>
                <td class="action-${entry.action}">
                  ${entry.action === 'entry' ? 'Entrada' : 
                    entry.action === 'exit' ? 'Salida' : 
                    entry.action === 'overhaul' ? 'Enviado a Overhaul' :
                    entry.action === 'overhaul_return' ? 'Retorno de Overhaul' : 'Reservado'}
                </td>
                <td>${entry.serialNumber || '-'}</td>
                <td><strong>${entry.partNumber}</strong></td>
                <td>${entry.quantity}</td>
                <td>${entry.user}</td>
                <td>${entry.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>KRONAIR - Sistema de Control de Almacén</p>
          <p>Este documento es un registro oficial de los movimientos de inventario</p>
        </div>
      </body>
      </html>
    `;

    // Crear un Blob con el contenido HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace temporal y hacer click para descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = `Historial_KRONAIR_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Abrir en nueva ventana para imprimir como PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Esperar a que cargue y abrir diálogo de impresión
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="historial" size={22} /> Historial y Trazabilidad</h2>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'almacen' ? 'active' : ''}`} onClick={() => setTab('almacen')}>
          Movimientos de Almacén ({history.length})
        </button>
        <button className={`tab ${tab === 'auditoria' ? 'active' : ''}`} onClick={() => setTab('auditoria')}>
          Auditoría General ({audit.length})
        </button>
      </div>

      {/* ── Movimientos de Almacén ── */}
      {tab === 'almacen' && (
        <>
          <div className="header-actions" style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Buscar por número de parte o serie..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="search-input"
            />
            <button onClick={downloadPDF} className="btn-primary btn-pdf">
              <Icon name="download" size={15} /> Descargar PDF (24h)
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Número de Serie</th>
                  <th>Número de Parte</th>
                  <th>Cantidad</th>
                  <th>Usuario</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {historyPg.pageItems.map(entry => (
                  <tr key={entry.id}>
                    <td data-label="Fecha">{new Date(entry.date).toLocaleString('es-MX')}</td>
                    <td data-label="Acción">
                      <span className={`action action-${entry.action}`}>
                        {entry.action === 'entry' ? 'Entrada' : 
                         entry.action === 'exit' ? 'Salida' : 
                         entry.action === 'overhaul' ? 'Enviado a Overhaul' :
                         entry.action === 'overhaul_return' ? 'Retorno de Overhaul' : 'Reservado'}
                      </span>
                    </td>
                    <td data-label="S/N">{entry.serialNumber || '-'}</td>
                    <td data-label="P/N">{entry.partNumber}</td>
                    <td data-label="Cantidad">{entry.quantity}</td>
                    <td data-label="Usuario">{entry.user}</td>
                    <td data-label="Notas">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredHistory.length === 0 && <EmptyState title="No hay movimientos de almacén" hint="Las entradas, salidas y overhaul quedarán registrados aquí." />}
          </div>
          <Pager page={historyPg.page} totalPages={historyPg.totalPages} total={historyPg.total} pageSize={historyPg.pageSize} onChange={historyPg.setPage} />
        </>
      )}

      {/* ── Auditoría General (todos los módulos) ── */}
      {tab === 'auditoria' && (
        <>
          <div className="header-actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="audit-chips">
              {auditModules.map(m => (
                <button
                  key={m}
                  className={`audit-chip ${auditModule === m ? 'active' : ''}`}
                  onClick={() => setAuditModule(m)}
                >
                  {m === 'all' ? 'Todo' : AUDIT_MODULE_LABEL[m]}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar en auditoría..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {auditPg.pageItems.map(e => (
                  <tr key={e.id}>
                    <td data-label="Fecha">{new Date(e.date).toLocaleString('es-CO')}</td>
                    <td data-label="Módulo"><span className={`audit-badge mod-${e.module}`}>{AUDIT_MODULE_LABEL[e.module]}</span></td>
                    <td data-label="Acción"><span className={`audit-action act-${e.action}`}>{AUDIT_ACTION_LABEL[e.action]}</span></td>
                    <td data-label="Descripción">{e.description}</td>
                    <td data-label="Usuario">{e.user}</td>
                    <td data-label="Referencia">{e.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAudit.length === 0 && <EmptyState title="No hay registros con estos filtros" hint="Prueba con otro módulo o cambia la búsqueda." />}
          </div>
          <Pager page={auditPg.page} totalPages={auditPg.totalPages} total={auditPg.total} pageSize={auditPg.pageSize} onChange={auditPg.setPage} />
        </>
      )}
    </div>
  );
};

export default Historial;
