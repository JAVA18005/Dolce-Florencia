# Estado del Progreso — Dolce Florencia

*Última actualización: 2026-09-24*

---

## 1. Resumen General del Estado

| Componente / Fase | Estado | Pruebas / Validación | Notas |
| :--- | :--- | :--- | :--- |
| **Fases 1 y 2 (Base & Front)** | **Cerradas** | Tests unitarios y build pasando | Commits consolidados |
| **Hito 1 (Auth del Personal)** | **Cerrado** | Tests de bcrypt, tokens opacos y login | Commit `63b1b3a` |
| **Hito 2 (Personal, Auditoría & Salón)** | **Cerrado** | 18 tests y build limpio | Commit `f8abf4c` |
| **Hito 3 (Ventas de Salón, Caja & Pedidos)** | **Cerrado** | 7 tests y build limpio | Commit `85bd41c` |
| **Hito 4 (Dashboard de Métricas & Catálogo)** | **Completado y probado** | 5 tests (129 total) y build limpio | Sin migraciones requeridas |

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

## 4. Alcance Planificado de Hitos 3 y 4 (docs/ARQUITECTURA.md §9)

### Hito 3 — Fase 4: Ventas de Salón, Caja y Pedidos Web (Máx. 10 líneas)
1. **Registro de Venta:** Mesero y admin registran ventas por mesa o mostrador; servidor calcula totales en centavos copiando nombre y precio de productos.
2. **Ciclo de Estados:** `PENDIENTE_COBRO` → `REALIZADA` (mesero/admin con método de pago manual: efectivo, QR, transferencia); `ANULADA` (solo admin con auditoría).
3. **Cuenta Única en BD:** Columna única anulable (`mesaCuentaUnicaAbiertaId`) que garantiza a nivel de base de datos una sola venta abierta en mesas normales y sofá.
4. **Múltiples Cuentas en Barra:** La barra (`permiteVariasCuentas = true`) admite varias cuentas abiertas concurrentes y no se muestra bloqueada.
5. **Estados Derivados de Mesa:** En tiempo real: `OCUPADA` (venta pendiente), `RESERVADA` (reserva confirmada hoy), `FUERA DE SERVICIO` (deshabilitada), `LIBRE`.
6. **Venta + Reserva de Hoy:** Al abrir venta en mesa con reserva confirmada de hoy, pasa automáticamente a `CUMPLIDA`; al cobrar, la mesa queda libre.
7. **Pedido a Venta:** Al marcar pedido `ENTREGADO`, se crea una `Venta` `PEDIDO_WEB` en la misma transacción con restricción única `pedidoId` en BD.

### Hito 4 — Fase 5: Dashboard, Productos, Imágenes & Storage (Máx. 10 líneas)
1. **Dashboard Administrativo:** Métricas de ingresos y tickets (hoy, semana, mes) en zona horaria `America/La_Paz`, contabilizando exclusivamente ventas `REALIZADA`.
2. **CRUD de Catálogo:** Gestión de categorías y productos (solo admin); productos nunca se borran sino que se archivan (`activo = false`).
3. **Auditoría de Precios:** Los cambios de precios y catálogo se auditan transaccionalmente sin afectar ítems de ventas históricas.
4. **Abstracción de Storage:** Interfaz de almacenamiento desacoplada (disco local para desarrollo; servicio externo R2/Cloudinary para disco efímero de Railway).
5. **Seguridad en Imágenes:** Validación de tamaño y magic bytes reales (rechazo estricto de SVG), nombres aleatorios por servidor, y endpoint bajo `/panel/...`.
6. **Menú Público Dinámico:** El catálogo público (`/menu`) se sincroniza en vivo con los productos activos del panel administrativo.
