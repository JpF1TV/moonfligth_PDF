import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import ModuleIcon, { ModuleIconName } from './ModuleIcon';
import './Layout.css';

interface NavItem {
  to: string;
  label: string;
  icon: ModuleIconName;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',             label: 'Inicio',        icon: 'inicio',        roles: ['warehouse', 'requester', 'admin'] },
  { to: '/almacen',      label: 'Almacén',       icon: 'almacen',       roles: ['warehouse', 'requester', 'admin'] },
  { to: '/historial',    label: 'Historial',     icon: 'historial',     roles: ['warehouse', 'requester', 'admin'] },
  { to: '/mantenimiento',label: 'Mantenimiento', icon: 'mantenimiento', roles: ['warehouse', 'requester', 'admin'] },
  { to: '/operaciones',  label: 'Operaciones',   icon: 'operaciones',   roles: ['warehouse', 'admin'] },
  { to: '/ingenieria',   label: 'Ingeniería',    icon: 'ingenieria',    roles: ['warehouse', 'admin'] },
  { to: '/oma',          label: 'OMA',           icon: 'oma',           roles: ['warehouse', 'admin'] },
  { to: '/admin-panel',  label: 'Panel Admin',   icon: 'admin',         roles: ['admin'] },
  { to: '/superadmin',   label: 'Super Admin',   icon: 'superadmin',    roles: ['superadmin'] },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  warehouse: 'Almacén',
  requester: 'Solicitante',
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const canAccess = (roles: string[]) => roles.includes(user?.role || '');
  const visibleItems = NAV_ITEMS.filter(i => canAccess(i.roles));

  const currentItem = visibleItems.find(i => i.to === location.pathname);
  const pageTitle = currentItem?.label || 'KRONAIR';

  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const avatar = user?.avatarUrl;

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo size={38} />
          {!collapsed && (
            <div className="sidebar-brand-text">
              <h1>KRONAIR</h1>
              <span>Gestión Aeronáutica</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon"><ModuleIcon name={item.icon} size={19} /></span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {avatar ? <img src={avatar} alt={user?.username} /> : initials}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <strong>{user?.username}</strong>
                <span>{ROLE_LABEL[user?.role || ''] || user?.role}</span>
              </div>
            )}
          </div>
          <button onClick={logout} className="sidebar-logout" title="Cerrar sesión">
            {collapsed ? <span>Salir</span> : <span>Cerrar Sesión</span>}
          </button>
        </div>

        {/* Marca de agua del logo */}
        <Logo size={220} className="sidebar-watermark" />
      </aside>

      {/* ── Contenido ── */}
      <div className="layout-body">
        <header className="topbar">
          <button className="topbar-toggle" onClick={() => setCollapsed(c => !c)} title="Contraer menú" aria-label="Contraer menú">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <h2 className="topbar-title">{pageTitle}</h2>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button
              className="topbar-icon-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>

            <div className="topbar-avatar">
              {avatar ? <img src={avatar} alt={user?.username} /> : initials}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
