# Estado del Progreso — Dolce Florencia

*Última actualización: 2026-09-24*

---

## 1. Resumen General del Estado

| Componente / Fase | Estado | Pruebas / Validación | Notas |
| :--- | :--- | :--- | :--- |
| **Fases 1 y 2 (Base & Front)** | **Cerradas** | Tests unitarios y build pasando | Commits consolidados |
| **Hito 1 (Auth del Personal)** | **Cerrado** | Tests de bcrypt, tokens opacos y login | Commit `63b1b3a` |
| **Hito 2 - Parte A (Cuentas & Auditoría)** | **Completado y probado** | 8 tests en `panel-usuarios.test.ts` | Migración `agregar_debe_cambiar_password` aplicada |
| **Hito 2 - Parte B (Operaciones & Salón)** | **Completado y probado** | 10 tests en `panel-operaciones.test.ts` | Pedidos, Reservas, Eventos, Mesas, Calendario |
| **Hito 3 (Ventas de Mostrador)** | **Pendiente** | — | Esperando aprobación y commit de Hito 2 |
| **Hito 4 (Dashboard, Productos & Storage)** | **Pendiente** | — | Programado post-Hito 3 |

---

## 2. Detalle de lo Implementado y Probado en el Hito 2

### Parte A: Cuentas del Personal, Sesiones y Auditoría
- **Modelo de Datos:**
  - Campo `debeCambiarPassword` en `Usuario` (migración `20260924155226_agregar_debe_cambiar_password`).
- **Servicio y Reglas de Negocio (`lib/servicios/usuarios.ts`):**
  - Creación de usuarios con contraseña inicial temporal y bandera obligatoria `debeCambiarPassword = true`.
  - Validación de contraseñas de 12 a 72 bytes en UTF-8 para prevenir truncamiento silencioso en bcrypt.
  - Salvaguardas críticas: no autodesactivación, no autodegradación de rol, y garantía de mantener al menos 1 administrador activo en el sistema.
  - Al cambiar contraseña, editar o desactivar un usuario, se invalidan de forma inmediata sus sesiones activas en base de datos.
- **Auditoría Transaccional (`lib/auditoria.ts`):**
  - Registro de eventos administrativos con `Prisma.TransactionClient`.
  - Se anonimizan/omiten credenciales (no se guardan contraseñas ni correos de usuarios inexistentes).
- **Vistas del Panel:**
  - `/panel/usuarios`: Creación y gestión de personal (solo ADMIN).
  - `/panel/cuenta`: Datos de la sesión actual, cambio voluntario de contraseña y botón para revocar todas las sesiones del usuario.
  - `/panel/cambiar-password`: Redirección forzosa si `debeCambiarPassword === true`.
- **Pruebas:** 8 pruebas en `tests/panel-usuarios.test.ts` (100% pasando).

---

### Parte B: Operaciones, Eventos, Cierres, Calendario y Mesas
- **Servicios de Operación y Reglas de Negocio:**
  - **Pedidos (`lib/servicios/pedidos-panel.ts`):** Confirmación registrando `totalAcordadoCentavos` (entero positivo), rechazo con motivo, cancelación, e idempotencia con auditoría. Alerta informativa si existen otras solicitudes para la misma fecha deseada.
  - **Eventos & Celebraciones (`lib/servicios/eventos-panel.ts`):** Confirmación exclusiva por Administrador. Cálculo dinámico de capacidad del salón (`calcularCapacidadTotalLocal`). Si la asistencia `personas >= capacidadTotalLocal`, se crea automáticamente el `DiaBloqueado` vinculado a la reserva (§5.4). Al cancelar el evento, solo se borra dicho bloqueo automático (sin tocar bloqueos manuales). Prevención transaccional de doble cierre en la misma fecha.
  - **Reservas de Mesa (`lib/servicios/reservas-panel.ts`):** Aislamiento `Serializable` con reintentos para asignación de mesa anti-doble reserva. Registro de estados: `CUMPLIDA`, `NO_LLEGO`, `RECHAZADA`, `CANCELADA`. Detección de posibles no-shows según hora + tolerancia (30 min por defecto desde tabla `Ajuste`).
  - **Mesas (`lib/servicios/mesas.ts`):** Estados derivados en tiempo real (`LIBRE`, `RESERVADA`, `FUERA_DE_SERVICIO`). Algoritmo de sugerencia de mesas libres según comensales y mascota. Habilitación/deshabilitación de mesas.
  - **Calendario (`lib/servicios/calendario.ts`):** Bloqueo y desbloqueo manual de fechas por administrador. Advertencia si existen reservas activas en la fecha a bloquear.
- **Vistas del Panel:**
  - `/panel/pedidos`: Bandeja de pedidos con detalle, ítems, enlaces directos a WhatsApp y modal de confirmación de monto.
  - `/panel/reservas`: Listado de reservas, selector de mesa asignada, estados y botones de acción.
  - `/panel/eventos`: Bandeja de eventos con advertencia de impacto en local y capacidad.
  - `/panel/mesas`: Cuadrícula visual de mesas con estados dinámicos, capacidad y conmutador de habilitación.
  - `/panel/calendario`: Vista de fechas bloqueadas (manuales y automáticas por eventos) con formulario de bloqueo.
- **Pruebas:** 10 pruebas en `tests/panel-operaciones.test.ts` (100% pasando).

---

## 3. Corrección de Arquitectura: Separación de Módulos Servidor / Cliente

### Causa Raíz
Los formularios públicos de la web (`FormularioEvento.tsx`, `FormularioPedido.tsx`, `FormularioReserva.tsx`) son componentes de cliente (`'use client'`). Al importar sus Server Actions de archivos que mezclaban funciones del panel (`exigirSesionServidor` -> `cookies()` de `next/headers`), el empaquetador de Next.js incluía referencias a APIs exclusivas de servidor en el bundle del cliente, provocando el fallo:
> `You're importing a component that needs "next/headers". That only works in a Server Component...`

### Solución Estructural (Sin Dynamic Imports)
Se desacoplaron totalmente los módulos en archivos independientes:
1. **Público (`'use server'` sin sesión administrativa):**
   - `lib/servicios/eventos.ts`: Contiene únicamente `crearEventoAction` con validación Zod, rate limiting por IP y generación de enlace WhatsApp.
   - `lib/servicios/pedidos.ts`: Contiene únicamente `crearPedidoAction`.
   - `lib/servicios/reservas.ts`: Contiene únicamente `crearReservaAction`.
2. **Panel Administrativo (Servidor con `exigirSesionServidor` y `next/headers`):**
   - `lib/servicios/eventos-panel.ts`: Funciones de listado, confirmación, cálculo de capacidad y cancelación de eventos.
   - `lib/servicios/pedidos-panel.ts`: Funciones de listado, conteo de solicitudes pendientes, confirmación con total acordado y cancelaciones.
   - `lib/servicios/reservas-panel.ts`: Funciones de listado, asignación anti-doble reserva con Serializable, no-show y estados.

### Resultado
- `npm run build`: Compilación exitosa en 5.5s con **0 errores** y **19 rutas generadas**.
- `npm test`: **117 tests pasando** en 14 suites sin dependencias cruzadas.

---

## 4. Qué Falta Antes de Empezar el Hito 3

1. **Revisión y Aprobación del Usuario:**
   - Inspeccionar la lista de archivos que entrarán al commit del Hito 2.
   - Confirmar que `.env` está estrictamente fuera de git.
2. **Commit Local del Hito 2:**
   - Mensaje sugerido: `Hito 2: Gestión de personal, auditoría, pedidos, reservas, eventos, mesas y calendario` (sin push).
3. **Plan de Inicio para el Hito 3 (Ventas de Mostrador):**
   - Modelado de ventas rápidas (`Venta`, `VentaItem`, medio de pago, montos enteros en centavos).
   - Servicio de registro de ventas con auditoría y actualización de stock cuando corresponda.
   - Interfaz de punto de venta / caja en el panel (`/panel/ventas`).
