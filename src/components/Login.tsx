import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import aircraftPhoto from '../assets/login-aircraft.jpg';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="login-page">
      {/* ── Panel izquierdo: branding + aeronave (foto real) ── */}
      <aside
        className="login-aside"
        style={{ backgroundImage: `url(${aircraftPhoto})` }}
      >
        <div className="login-aside-overlay" />
        <div className="login-aside-content">
          <span className="login-badge">KRONAIR SOFTWARE</span>
          <h1 className="login-aside-title">KRONAIR</h1>
          <p className="login-aside-sub">
            Sistema Integral de Gestión Aeronáutica
          </p>
          <p className="login-aside-desc">
            Controla inventario, mantenimiento, operaciones de vuelo e ingeniería
            de tu flota desde un solo lugar.
          </p>
        </div>
      </aside>

      {/* ── Panel derecho: formulario ── */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-logo">
            <Logo size={64} />
          </div>
          <h2 className="login-welcome">Bienvenido</h2>
          <p className="login-welcome-sub">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Usuario</span>
              <input
                type="text"
                placeholder="Tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit">Iniciar Sesión</button>
          </form>

          <div className="demo-users">
            <p>Usuarios demo:</p>
            <small>admin/admin123 · almacen/almacen123 · usuario/usuario123</small>
          </div>
          <div className="app-credits">Diseñado por Juan &amp; Carlos</div>
        </div>
      </main>
    </div>
  );
};

export default Login;
