# Guía de Pruebas y Registro de Errores — KRONAIR

Documento para registrar pruebas, errores y observaciones durante la fase de testing.

---

## 1. Información del entorno

| Dato | Valor |
|---|---|
| Versión / commit | _(ej: 92e440a)_ |
| Entorno | Local (`http://localhost:5173`) / Vercel |
| Navegador | _(Chrome, Firefox, Edge...)_ |
| Fecha de la sesión de pruebas | |
| Responsable | |

---

## 2. Usuarios de prueba

> Las credenciales están definidas en `src/context/AuthContext.tsx`.

| Usuario | Contraseña | Rol | Redirige a |
|---|---|---|---|
| `superadmin` | `super123` | superadmin | /superadmin |
| `admin` | `admin123` | admin | /admin-panel |
| `almacen` | `almacen123` | warehouse | /almacen |
| `usuario` | `usuario123` | requester | /mantenimiento |

---

## 3. Persistencia de datos (localStorage)

Los datos se guardan en el navegador con prefijo `kronair:`. Persisten al recargar, pero son por navegador/dispositivo.

| Dato | Clave |
|---|---|
| Usuarios | `kronair:users` |
| Sesiones | `kronair:sessions` |
| Inventario | `kronair:parts` |
| Solicitudes | `kronair:requests` |
| Historial | `kronair:history` |
| Tickets | `kronair:tickets` |
| Pilotos | `kronair:pilots` |
| Aeronaves | `kronair:aircraft` |
| Bitácoras de vuelo | `kronair:flightLogs` |
| Componentes | `kronair:components` |
| Órdenes de trabajo | `kronair:workOrders` |

**Reiniciar datos de prueba:** F12 → Application → Local Storage → borrar claves `kronair:*`.
O en la consola del navegador:
```js
Object.keys(localStorage).filter(k => k.startsWith('kronair:')).forEach(k => localStorage.removeItem(k))
```

---

## 4. Checklist de pruebas por módulo

Marca cada caso: ✅ OK · ❌ Falla · ⚠️ Con observaciones · ⬜ Sin probar

### 4.1 Autenticación
- [ ] Login con cada usuario de prueba redirige al módulo correcto
- [ ] Login con credenciales incorrectas muestra error
- [ ] Logout cierra sesión y vuelve al login
- [ ] Al recargar (F5) pide login de nuevo pero los datos siguen guardados
- [ ] Rutas protegidas redirigen a /login sin sesión
- [ ] Un rol sin permiso no accede a rutas de admin/superadmin

### 4.2 Almacén (inventario)
- [ ] Listado de partes carga correctamente
- [ ] Agregar nueva parte
- [ ] Agregar ítem (serial) a una parte
- [ ] Editar parte / ítem
- [ ] Estados (disponible, overhaul, reservado, salida) se muestran bien
- [ ] Los cambios persisten tras recargar

### 4.3 Solicitudes / Historial
- [ ] Crear solicitud de parte
- [ ] Aprobar / rechazar solicitud
- [ ] El historial registra la acción
- [ ] Persistencia tras recargar

### 4.4 Mantenimiento / Tickets
- [ ] Crear ticket (número autogenerado correcto)
- [ ] Editar ticket
- [ ] Eliminar ticket
- [ ] Persistencia tras recargar

### 4.5 Operaciones
- [ ] Listado de pilotos y aeronaves
- [ ] Agregar/editar/eliminar piloto
- [ ] Agregar/editar aeronave
- [ ] Registrar bitácora de vuelo
- [ ] Horas y ciclos de piloto y aeronave se actualizan al registrar vuelo
- [ ] Persistencia tras recargar

### 4.6 Ingeniería (componentes)
- [ ] Listado de componentes con estados (ok / alerta / vencido)
- [ ] Agregar componente calcula estado correctamente
- [ ] Editar / eliminar componente
- [ ] Recalcular estado según horas/ciclos actuales
- [ ] Persistencia tras recargar

### 4.7 OMA (órdenes de trabajo)
- [ ] Listado de órdenes de trabajo
- [ ] Crear orden (número OT autogenerado)
- [ ] Generar orden desde un componente
- [ ] Editar / eliminar orden
- [ ] **Descargar PDF MCM-002 y verificar que el logo aparezca**
- [ ] Datos del PDF correctos (aeronave, componente, fechas, firmas)
- [ ] Persistencia tras recargar

---

## 5. Registro de errores

Copia esta plantilla por cada error encontrado.

### Error #___

| Campo | Detalle |
|---|---|
| **Título** | _(resumen corto)_ |
| **Módulo** | _(Almacén, OMA, Login...)_ |
| **Severidad** | 🔴 Crítico / 🟠 Alto / 🟡 Medio / 🟢 Bajo |
| **Estado** | Abierto / En progreso / Resuelto / No se reproduce |
| **Fecha** | |
| **Reportado por** | |
| **Entorno** | Local / Vercel · Navegador |

**Pasos para reproducir:**
1.
2.
3.

**Resultado esperado:**

**Resultado actual:**

**Evidencia:** _(captura, mensaje de consola F12, etc.)_

**Notas / solución aplicada:**

---

<!-- Duplica el bloque "Error #___" para cada hallazgo -->

## 6. Severidades (referencia)

| Nivel | Criterio |
|---|---|
| 🔴 Crítico | Bloquea el uso, pérdida de datos, la app no carga |
| 🟠 Alto | Función importante no sirve, sin workaround |
| 🟡 Medio | Falla con workaround, o afecta algo secundario |
| 🟢 Bajo | Cosmético, textos, detalles de UI |

---

## 7. Observaciones generales

_(Ideas de mejora, dudas, comportamientos raros que no son errores claros.)_

-
-
-
