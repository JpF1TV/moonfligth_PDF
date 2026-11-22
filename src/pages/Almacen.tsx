import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
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

const Almacen: React.FC = () => {
  const { parts, addPart, updatePart, deletePart, addPartItem, updatePartItem, deletePartItem, addHistory, addRequest } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { logAudit } = useAudit();
  const confirm = useConfirm();

  const puedeEditar = canEdit(user, 'almacen');
  const puedeEliminar = canDelete(user, 'almacen');
  const [activeTab, setActiveTab] = useState<'inventory' | 'overhaul'>('inventory');
  const [showForm, setShowForm] = useState(false);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOverhaulForm, setShowOverhaulForm] = useState<{ partId: string; itemId: string } | null>(null);
  const [showExitForm, setShowExitForm] = useState<{ partId: string; itemId: string } | null>(null);

  // Edición de pieza (descripción)
  const [editPart, setEditPart] = useState<{ id: string; description: string } | null>(null);

  // Edición de ítem/unidad
  const [editItem, setEditItem] = useState<{
    partId: string; itemId: string;
    partNumber: string; serialNumber: string; location: string; notes: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    type: 'unit' as 'unit' | 'bulk',
    serialNumber: '',
    partNumber: '',
    location: '',
    quantity: 1
  });

  const [itemFormData, setItemFormData] = useState({
    serialNumber: '',
    partNumber: '',
    location: '',
    notes: '',
    isOverhaul: false,
    repairShop: '',
    aircraftRemoved: '',
    expectedReturn: '',
    reason: '',
    pdfFile: null as File | null
  });

  const [overhaulFormData, setOverhaulFormData] = useState({
    expectedReturn: '',
    repairShop: '',
    reason: '',
    aircraftRemoved: ''
  });

  const [exitFormData, setExitFormData] = useState({
    quantity: 1,
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPart = {
      description: formData.description,
      type: formData.type,
      items: formData.type === 'bulk' 
        ? [{
            id: '',
            serialNumber: formData.serialNumber,
            partNumber: formData.partNumber,
            location: formData.location,
            status: 'available' as const,
            entryDate: new Date().toISOString().split('T')[0]
          }]
        : []
    };
    
    addPart(newPart);
    addHistory({
      partNumber: formData.partNumber,
      serialNumber: formData.type === 'bulk' ? formData.serialNumber : undefined,
      action: 'entry',
      quantity: formData.type === 'bulk' ? formData.quantity : 0,
      user: user?.username || '',
      date: new Date().toISOString()
    });
    logAudit({ module: 'almacen', action: 'create', user: user?.username || '', description: `Registró la pieza "${formData.description}"` });
    
    setFormData({ description: '', type: 'unit', serialNumber: '', partNumber: '', location: '', quantity: 1 });
    setShowForm(false);
  };

  const handleAddItem = (partId: string) => {
    const newItem: any = {
      serialNumber: itemFormData.serialNumber,
      partNumber: itemFormData.partNumber,
      location: itemFormData.location,
      status: itemFormData.isOverhaul ? 'overhaul' : 'available',
      entryDate: new Date().toISOString().split('T')[0],
      notes: itemFormData.notes
    };

    // Si es overhaul, agregar la información
    if (itemFormData.isOverhaul) {
      newItem.overhaulInfo = {
        sentDate: new Date().toISOString().split('T')[0],
        expectedReturn: itemFormData.expectedReturn,
        repairShop: itemFormData.repairShop,
        reason: itemFormData.reason,
        aircraftRemoved: itemFormData.aircraftRemoved
      };
    }

    // Si hay PDF, procesarlo
    if (itemFormData.pdfFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newItem.pdfUrl = e.target?.result as string;
        newItem.pdfName = itemFormData.pdfFile?.name;
        
        addPartItem(partId, newItem);
        
        addHistory({
          partNumber: itemFormData.partNumber,
          serialNumber: itemFormData.serialNumber,
          action: itemFormData.isOverhaul ? 'overhaul' : 'entry',
          quantity: 1,
          user: user?.username || '',
          date: new Date().toISOString(),
          notes: itemFormData.isOverhaul ? `Ingreso directo a overhaul - ${itemFormData.reason}` : undefined
        });
      };
      reader.readAsDataURL(itemFormData.pdfFile);
    } else {
      addPartItem(partId, newItem);
      
      addHistory({
        partNumber: itemFormData.partNumber,
        serialNumber: itemFormData.serialNumber,
        action: itemFormData.isOverhaul ? 'overhaul' : 'entry',
        quantity: 1,
        user: user?.username || '',
        date: new Date().toISOString(),
        notes: itemFormData.isOverhaul ? `Ingreso directo a overhaul - ${itemFormData.reason}` : undefined
      });
    }
    
    setItemFormData({ 
      serialNumber: '', 
      partNumber: '', 
      location: '',
      notes: '', 
      isOverhaul: false,
      repairShop: '',
      aircraftRemoved: '',
      expectedReturn: '',
      reason: '',
      pdfFile: null
    });
    setShowItemForm(null);
  };

  const handleSendToOverhaul = (partId: string, itemId: string) => {
    const part = parts.find(p => p.id === partId);
    const item = part?.items.find(i => i.id === itemId);
    
    if (item) {
      // Crear solicitud de overhaul
      addRequest({
        partNumber: item.partNumber,
        serialNumber: item.serialNumber,
        quantity: 1,
        requestedBy: user?.username || '',
        requestDate: new Date().toISOString(),
        status: 'pending',
        notes: overhaulFormData.reason,
        requestType: 'overhaul',
        overhaulInfo: {
          repairShop: overhaulFormData.repairShop,
          aircraftRemoved: overhaulFormData.aircraftRemoved,
          expectedReturn: overhaulFormData.expectedReturn,
          reason: overhaulFormData.reason
        }
      });
      
      setOverhaulFormData({ expectedReturn: '', repairShop: '', reason: '', aircraftRemoved: '' });
      setShowOverhaulForm(null);
      logAudit({ module: 'solicitudes', action: 'create', user: user?.username || '', description: `Solicitó overhaul de ${item.partNumber} (S/N ${item.serialNumber})`, reference: item.serialNumber });
      toast.success('Solicitud de overhaul enviada. Espera aprobación del administrador.');
    }
  };

  const handleRequestExit = (partId: string, itemId: string) => {
    const part = parts.find(p => p.id === partId);
    const item = part?.items.find(i => i.id === itemId);
    
    if (item) {
      // Crear solicitud de salida
      addRequest({
        partNumber: item.partNumber,
        serialNumber: item.serialNumber,
        quantity: exitFormData.quantity,
        requestedBy: user?.username || '',
        requestDate: new Date().toISOString(),
        status: 'pending',
        notes: exitFormData.reason,
        requestType: 'exit'
      });
      
      setExitFormData({ quantity: 1, reason: '' });
      setShowExitForm(null);
      logAudit({ module: 'solicitudes', action: 'create', user: user?.username || '', description: `Solicitó salida de ${item.partNumber} (S/N ${item.serialNumber})`, reference: item.serialNumber });
      toast.success('Solicitud de salida enviada. Espera aprobación del administrador.');
    }
  };

  const handleReturnFromOverhaul = (partId: string, itemId: string) => {
    const part = parts.find(p => p.id === partId);
    const item = part?.items.find(i => i.id === itemId);
    
    if (item) {
      updatePartItem(partId, itemId, {
        status: 'available',
        overhaulInfo: undefined
      });
      
      addHistory({
        partNumber: item.partNumber,
        serialNumber: item.serialNumber,
        action: 'overhaul_return',
        quantity: 1,
        user: user?.username || '',
        date: new Date().toISOString(),
        notes: 'Retornado de overhaul'
      });
    }
  };

  const handleFileUpload = (partId: string, itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updatePartItem(partId, itemId, {
        pdfUrl: e.target?.result as string,
        pdfName: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExit = (partId: string, itemId: string) => {
    setShowExitForm({ partId, itemId });
  };

  // ── Editar / eliminar PIEZA ──────────────────────────────────────────────
  const saveEditPart = () => {
    if (!editPart) return;
    updatePart(editPart.id, { description: editPart.description });
    logAudit({ module: 'almacen', action: 'update', user: user?.username || '', description: `Editó la pieza "${editPart.description}"` });
    setEditPart(null);
  };

  const handleDeletePart = async (partId: string, description: string) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar pieza',
      message: `Se eliminará "${description}" y TODAS sus unidades. Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deletePart(partId);
      logAudit({ module: 'almacen', action: 'delete', user: user?.username || '', description: `Eliminó la pieza "${description}"` });
    }
  };

  // ── Editar / eliminar UNIDAD (item) ──────────────────────────────────────
  const saveEditItem = () => {
    if (!editItem) return;
    updatePartItem(editItem.partId, editItem.itemId, {
      partNumber: editItem.partNumber,
      serialNumber: editItem.serialNumber,
      location: editItem.location,
      notes: editItem.notes,
    });
    logAudit({ module: 'almacen', action: 'update', user: user?.username || '', description: `Editó la unidad S/N ${editItem.serialNumber} (P/N ${editItem.partNumber})`, reference: editItem.serialNumber });
    setEditItem(null);
  };

  const handleDeleteItem = async (partId: string, itemId: string, sn: string) => {
    const ok = await confirm({
      danger: true,
      title: 'Eliminar unidad',
      message: `Se eliminará la unidad S/N "${sn}". Esta acción no se puede deshacer.`,
    });
    if (ok) {
      deletePartItem(partId, itemId);
      logAudit({ module: 'almacen', action: 'delete', user: user?.username || '', description: `Eliminó la unidad S/N ${sn}`, reference: sn });
    }
  };

  const getAvailableCount = (part: any) => {
    return part.items.filter((i: any) => i.status === 'available').length;
  };

  // Filtrar piezas según búsqueda
  const filteredParts = parts.filter(part => 
    part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.items.some(item => 
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Separar piezas en inventario y overhaul
  const inventoryParts = filteredParts.map(part => ({
    ...part,
    items: part.items.filter(item => item.status !== 'overhaul')
  }));

  const overhaulParts = filteredParts.map(part => ({
    ...part,
    items: part.items.filter(item => item.status === 'overhaul')
  })).filter(part => part.items.length > 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"><ModuleIcon name="almacen" size={22} /> Almacén</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Buscar por descripción, P/N o S/N..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-large"
          />
          {puedeEditar && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Icon name="plus" size={15} /> Nueva Pieza
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventario ({inventoryParts.reduce((acc, p) => acc + p.items.length, 0)})
        </button>
        <button 
          className={`tab ${activeTab === 'overhaul' ? 'active' : ''}`}
          onClick={() => setActiveTab('overhaul')}
        >
          Overhaul ({overhaulParts.reduce((acc, p) => acc + p.items.length, 0)})
        </button>
      </div>

      {puedeEditar && (
      <Drawer open={showForm} title="Registrar Nueva Pieza" onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-grid">
            <input
              type="text"
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'unit' | 'bulk' })}
              required
            >
              <option value="unit">Pieza Unitaria (Rotor, Motor, etc.)</option>
              <option value="bulk">Consumible (Tornillos, etc.)</option>
            </select>
            {formData.type === 'bulk' && (
              <>
                <input
                  type="text"
                  placeholder="Número de Parte"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Número de Serie/Lote"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Ubicación (ej: A-01)"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  min="1"
                  required
                />
              </>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Drawer>
      )}

      {activeTab === 'inventory' && inventoryParts.length === 0 && (
        <EmptyState
          title="No hay piezas registradas"
          hint="Registra la primera pieza para empezar a controlar el inventario."
          action={puedeEditar ? { label: 'Registrar la primera pieza', onClick: () => setShowForm(true) } : undefined}
        />
      )}
      {activeTab === 'overhaul' && overhaulParts.length === 0 && (
        <EmptyState title="No hay piezas en overhaul" hint="Las piezas enviadas a overhaul aparecerán aquí." />
      )}

      <div className="parts-list">
        {activeTab === 'inventory' && inventoryParts.map(part => (
          <div key={part.id} className="part-card-compact">
            <div className="part-header-compact" onClick={() => setExpandedPart(expandedPart === part.id ? null : part.id)}>
              <div className="part-info-compact">
                <h4>{part.description}</h4>
                <span className="part-meta">{part.type === 'unit' ? 'Unitaria' : 'Consumible'} · Disponibles {getAvailableCount(part)}/{part.items.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {puedeEditar && (
                  <button
                    className="btn-icon sm edit"
                    onClick={(e) => { e.stopPropagation(); setEditPart({ id: part.id, description: part.description }); }}
                    title="Editar pieza"
                    aria-label="Editar pieza"
                  >
                    <Icon name="edit" size={15} />
                  </button>
                )}
                {puedeEliminar && (
                  <button
                    className="btn-icon sm delete"
                    onClick={(e) => { e.stopPropagation(); handleDeletePart(part.id, part.description); }}
                    title="Eliminar pieza"
                    aria-label="Eliminar pieza"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
                <button className="btn-icon sm" aria-label={expandedPart === part.id ? 'Contraer' : 'Expandir'}>
                  <Icon name={expandedPart === part.id ? 'chevron-left' : 'chevron-right'} size={15} />
                </button>
              </div>
            </div>

            {expandedPart === part.id && (
              <div className="part-details-compact">
                {part.type === 'unit' && puedeEditar && (
                  <button 
                    onClick={() => setShowItemForm(showItemForm === part.id ? null : part.id)} 
                    className="btn-primary btn-small-margin"
                  >
                    + Agregar Unidad
                  </button>
                )}

                {showItemForm === part.id && (
                  <div className="item-form-extended">
                    <h4>Agregar Nueva Unidad</h4>
                    <div className="form-grid">
                      <input
                        type="text"
                        placeholder="Número de Parte (P/N)"
                        value={itemFormData.partNumber}
                        onChange={(e) => setItemFormData({ ...itemFormData, partNumber: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Número de Serie (S/N)"
                        value={itemFormData.serialNumber}
                        onChange={(e) => setItemFormData({ ...itemFormData, serialNumber: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Ubicación (ej: A-01)"
                        value={itemFormData.location}
                        onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Notas (opcional)"
                        value={itemFormData.notes}
                        onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                      />
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="file-upload-label">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setItemFormData({ ...itemFormData, pdfFile: file });
                            }}
                            style={{ display: 'none' }}
                          />
                          <span className="file-upload-btn">
                            <Icon name="clip" size={15} /> {itemFormData.pdfFile ? itemFormData.pdfFile.name : 'Adjuntar PDF de Trazabilidad (opcional)'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="overhaul-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={itemFormData.isOverhaul}
                          onChange={(e) => setItemFormData({ ...itemFormData, isOverhaul: e.target.checked })}
                        />
                        <span>Ingresar directamente a Overhaul</span>
                      </label>
                    </div>

                    {itemFormData.isOverhaul && (
                      <div className="overhaul-fields">
                        <h5>Información de Overhaul</h5>
                        <div className="form-grid">
                          <input
                            type="text"
                            placeholder="Taller de Reparación"
                            value={itemFormData.repairShop}
                            onChange={(e) => setItemFormData({ ...itemFormData, repairShop: e.target.value })}
                            required
                          />
                          <input
                            type="text"
                            placeholder="Aeronave Removida"
                            value={itemFormData.aircraftRemoved}
                            onChange={(e) => setItemFormData({ ...itemFormData, aircraftRemoved: e.target.value })}
                          />
                          <input
                            type="date"
                            placeholder="Fecha Retorno Esperada"
                            value={itemFormData.expectedReturn}
                            onChange={(e) => setItemFormData({ ...itemFormData, expectedReturn: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Razón del Overhaul"
                            value={itemFormData.reason}
                            onChange={(e) => setItemFormData({ ...itemFormData, reason: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-actions">
                      <button onClick={() => handleAddItem(part.id)} className="btn-primary">
                        {itemFormData.isOverhaul ? 'Agregar a Overhaul' : 'Agregar a Inventario'}
                      </button>
                      <button onClick={() => setShowItemForm(null)} className="btn-cancel">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <table className="items-table-compact">
                  <thead>
                    <tr>
                      <th>P/N</th>
                      <th>S/N</th>
                      <th>Ubicación</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>PDF</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {part.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="table-empty">
                          No hay unidades. Haz clic en "+ Agregar Unidad".
                        </td>
                      </tr>
                    ) : (
                      part.items.map(item => (
                        <tr key={item.id}>
                          <td data-label="P/N"><strong>{item.partNumber}</strong></td>
                          <td data-label="S/N">{item.serialNumber}</td>
                          <td data-label="Ubicación">{item.location}</td>
                          <td data-label="Fecha">{new Date(item.entryDate).toLocaleDateString('es-MX')}</td>
                          <td data-label="Estado">
                            <span className={`status status-${item.status}`}>
                              {item.status === 'available' ? 'Disponible' : 
                               item.status === 'reserved' ? 'Reservado' : 'Salida'}
                            </span>
                          </td>
                          <td data-label="PDF">
                            {item.pdfUrl ? (
                              <a href={item.pdfUrl} download={item.pdfName} className="pdf-link">
                                <Icon name="file" size={16} />
                              </a>
                            ) : (
                              <label className="upload-label">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(part.id, item.id, file);
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <Icon name="clip" size={16} />
                              </label>
                            )}
                          </td>
                          <td data-label="Notas">{item.notes || '-'}</td>
                          <td data-label="Acciones">
                            <div className="actions-cell">
                              <button
                                onClick={() => handleExit(part.id, item.id)}
                                className="btn-soft btn-soft-delete"
                                disabled={item.status !== 'available'}
                                title="Solicitar Salida"
                              >
                                Salida
                              </button>
                              <button
                                onClick={() => setShowOverhaulForm({ partId: part.id, itemId: item.id })}
                                className="btn-soft btn-soft-warn"
                                disabled={item.status !== 'available'}
                                title="Solicitar Overhaul"
                              >
                                OH
                              </button>
                              {puedeEditar && (
                                <button
                                  onClick={() => setEditItem({ partId: part.id, itemId: item.id, partNumber: item.partNumber, serialNumber: item.serialNumber, location: item.location, notes: item.notes || '' })}
                                  className="btn-icon sm edit"
                                  title="Editar unidad"
                                  aria-label="Editar unidad"
                                >
                                  <Icon name="edit" size={15} />
                                </button>
                              )}
                              {puedeEliminar && (
                                <button
                                  onClick={() => handleDeleteItem(part.id, item.id, item.serialNumber)}
                                  className="btn-icon sm delete"
                                  title="Eliminar unidad"
                                  aria-label="Eliminar unidad"
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {activeTab === 'overhaul' && overhaulParts.map(part => (
          <div key={part.id} className="part-card-compact overhaul-card">
            <div className="part-header-compact" onClick={() => setExpandedPart(expandedPart === part.id ? null : part.id)}>
              <div className="part-info-compact">
                <h4>{part.description}</h4>
                <span className="part-meta">En Overhaul: {part.items.length}</span>
              </div>
              <button className="btn-icon sm" aria-label={expandedPart === part.id ? 'Contraer' : 'Expandir'}>
                <Icon name={expandedPart === part.id ? 'chevron-left' : 'chevron-right'} size={15} />
              </button>
            </div>

            {expandedPart === part.id && (
              <div className="part-details-compact">
                <table className="items-table-compact">
                  <thead>
                    <tr>
                      <th>P/N</th>
                      <th>S/N</th>
                      <th>Ubicación</th>
                      <th>Enviado</th>
                      <th>Taller</th>
                      <th>Aeronave</th>
                      <th>Razón</th>
                      <th>Retorno</th>
                      <th>PDF</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {part.items.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.partNumber}</strong></td>
                        <td>{item.serialNumber}</td>
                        <td>{item.location}</td>
                        <td>{item.overhaulInfo?.sentDate ? new Date(item.overhaulInfo.sentDate).toLocaleDateString('es-MX') : '-'}</td>
                        <td>{item.overhaulInfo?.repairShop || '-'}</td>
                        <td>{item.overhaulInfo?.aircraftRemoved || '-'}</td>
                        <td>{item.overhaulInfo?.reason || '-'}</td>
                        <td>{item.overhaulInfo?.expectedReturn ? new Date(item.overhaulInfo.expectedReturn).toLocaleDateString('es-MX') : '-'}</td>
                        <td>
                          {item.pdfUrl ? (
                            <a href={item.pdfUrl} download={item.pdfName} className="pdf-link">
                              <Icon name="file" size={16} />
                            </a>
                          ) : '-'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleReturnFromOverhaul(part.id, item.id)}
                            className="btn-soft btn-soft-ok"
                          >
                            Retornar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showExitForm && (
        <div className="modal-overlay" onClick={() => setShowExitForm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Solicitar Salida de Pieza</h3>
            <div className="form-grid">
              <input
                type="number"
                placeholder="Cantidad"
                value={exitFormData.quantity}
                onChange={(e) => setExitFormData({ ...exitFormData, quantity: parseInt(e.target.value) })}
                min="1"
                required
              />
              <input
                type="text"
                placeholder="Motivo de la salida"
                value={exitFormData.reason}
                onChange={(e) => setExitFormData({ ...exitFormData, reason: e.target.value })}
                required
                style={{ gridColumn: '1 / -1' }}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => handleRequestExit(showExitForm.partId, showExitForm.itemId)} className="btn-primary">
                Enviar Solicitud
              </button>
              <button onClick={() => setShowExitForm(null)} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverhaulForm && (
        <div className="modal-overlay" onClick={() => setShowOverhaulForm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Solicitar Overhaul</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Taller de Reparación"
                value={overhaulFormData.repairShop}
                onChange={(e) => setOverhaulFormData({ ...overhaulFormData, repairShop: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Aeronave Removida"
                value={overhaulFormData.aircraftRemoved}
                onChange={(e) => setOverhaulFormData({ ...overhaulFormData, aircraftRemoved: e.target.value })}
              />
              <input
                type="date"
                placeholder="Fecha Retorno Esperada"
                value={overhaulFormData.expectedReturn}
                onChange={(e) => setOverhaulFormData({ ...overhaulFormData, expectedReturn: e.target.value })}
              />
              <input
                type="text"
                placeholder="Razón del Overhaul"
                value={overhaulFormData.reason}
                onChange={(e) => setOverhaulFormData({ ...overhaulFormData, reason: e.target.value })}
                required
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => handleSendToOverhaul(showOverhaulForm.partId, showOverhaulForm.itemId)} className="btn-primary">
                Enviar Solicitud
              </button>
              <button onClick={() => setShowOverhaulForm(null)} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Pieza ── */}
      {editPart && (
        <div className="modal-overlay" onClick={() => setEditPart(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Pieza</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Descripción"
                value={editPart.description}
                onChange={(e) => setEditPart({ ...editPart, description: e.target.value })}
                style={{ gridColumn: '1 / -1' }}
                required
              />
            </div>
            <div className="modal-actions">
              <button onClick={saveEditPart} className="btn-primary">Guardar</button>
              <button onClick={() => setEditPart(null)} className="btn-cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Unidad ── */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Unidad</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Número de Parte (P/N)"
                value={editItem.partNumber}
                onChange={(e) => setEditItem({ ...editItem, partNumber: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Número de Serie (S/N)"
                value={editItem.serialNumber}
                onChange={(e) => setEditItem({ ...editItem, serialNumber: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Ubicación"
                value={editItem.location}
                onChange={(e) => setEditItem({ ...editItem, location: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Notas"
                value={editItem.notes}
                onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button onClick={saveEditItem} className="btn-primary">Guardar</button>
              <button onClick={() => setEditItem(null)} className="btn-cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Almacen;
