# Dolce Florencia — Arquitectura y reglas de negocio

Documento base para desarrollar la versión de producción (usar como contexto en Antigravity).
Complementa `BRAND.md` (identidad visual y paleta rosa/fucsia/café/olivo) y `prisma/schema.prisma` (modelo de datos).
**Reemplaza** a `propuesta-tecnica-dolce-florencia.md`, que queda como histórico.

---

## 1. Alcance

Una sola aplicación web con dos modos:

- **Público** (sin login): inicio, menú con realidad aumentada, pedidos y eventos, reservas de mesa, seguimiento por código, contacto.
- **Panel interno** (login de personal): dashboard, ventas, pedidos, reservas, calendario, mesas y productos.

Los clientes **no tienen cuenta**. Toda solicitud pública se guarda en la base de datos y luego se envía por WhatsApp.

## 2. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| App | Next.js (App Router) + TypeScript | Un solo proyecto para público, panel y API; SSR para SEO |
| Base de datos | PostgreSQL | Escrituras concurrentes y transacciones (confirmaciones, cobros) |
| ORM | Prisma | Esquema tipado y migraciones |
| Validación | Zod | Todo input se valida en el servidor |
| Auth (solo personal) | Autenticación propia: bcryptjs + tabla Sesion con token opaco, cookies `httpOnly` | Sin JWT en localStorage, revocación inmediata en BD |
| Anti-spam | Cloudflare Turnstile + honeypot + rate limit | Formularios públicos sin login |
| AR | `<model-viewer>` (Google) con `.glb` y `.usdz` opcional | Funciona en el navegador móvil |
| Imágenes de productos | Cloudinary o Cloudflare R2 | El disco del contenedor no es persistente |
| Hosting | Railway: servicio `web` + servicio `postgres` | Ver §8 |

Los nombres de modelos, campos y rutas van **en español**, igual que el negocio.

## 3. Flujos públicos

### 3.1 Pedido / Evento / Reserva de mesa
1. La persona llena el formulario (nombre, teléfono, fecha con calendario, detalles). Se valida en cliente y **de nuevo en servidor**.
2. El servidor crea el registro en estado `PENDIENTE` con un código corto aleatorio (`DF-K7M2QX`).
3. La respuesta devuelve un enlace `wa.me/<numero>?text=<mensaje codificado>` con el resumen y el código. La web abre WhatsApp; la persona envía el mensaje.
4. La web **nunca** dice "pedido confirmado", dice "solicitud recibida, la pastelería te confirmará".
5. El personal ve la solicitud en el panel, contacta al cliente (botón "Abrir WhatsApp") y confirma o rechaza.

Campos propios de la **reserva de mesa**: personas, hora de llegada, preferencia de zona (interior, exterior, sofá o sin preferencia) y casilla **"Voy con mi mascota"** (la cafetería es pet friendly). Si marca la casilla, el panel filtra las mesas que aceptan mascotas. La barra no es reservable.

Cuidados:
- Guardar primero, abrir WhatsApp después: si la persona no envía el mensaje, la solicitud igual queda registrada.
- Normalizar el teléfono a `591XXXXXXXX` (Bolivia).
- Precios de pedidos: el catálogo puede tener precio, pero tortas personalizadas y eventos se cotizan por WhatsApp. El admin fija `totalAcordadoCentavos` al confirmar.

### 3.2 Calendario público
- Muestra los días de la tabla `DiaBloqueado` como tachados/no seleccionables. Expone solo fechas, ningún dato personal.
- Un evento `EN_LOCAL` bloquea el día al **confirmarse**. Un evento con modalidad `ENTREGA` **no** bloquea nada.
- Solicitudes pendientes no bloquean el día. Si hay varias pendientes para la misma fecha, al confirmar una el panel avisa de las demás.

### 3.3 Seguimiento
- Se consulta con **código + últimos 4 dígitos del teléfono**. Con rate limit. Muestra solo estado y mensaje del negocio, nunca datos de otros.

### 3.4 Menú con AR
- Cada producto puede tener `modeloArUrl` (`.glb`, en metros, escala real) y opcional `modeloArIosUrl`.
- Botón "Ver en tu mesa" solo si hay modelo. Si el dispositivo no soporta AR, queda el visor 3D.
- Objetivo de peso: menos de ~5 MB por modelo (compresión Draco). Requiere HTTPS.
- Variantes de tamaño (ej. 20 cm y 26 cm) = productos o variantes con modelos distintos.

## 4. Roles y permisos

Definir **todo** en `lib/permisos.ts`, una función `puede(rol, accion)`. Se verifica en el servidor en cada acción; ocultar botones no cuenta como seguridad.

| Acción | Mesero | Admin |
|---|:---:|:---:|
| Ver mesas y su estado | ✅ | ✅ |
| Registrar ventas / agregar ítems | ✅ | ✅ |
| Marcar venta como `REALIZADA` (cobro en caja) | ✅ | ✅ |
| Ver y confirmar reservas de mesa, asignar mesa | ✅ | ✅ |
| Ver y confirmar pedidos | ✅ | ✅ |
| Confirmar eventos | ❌ | ✅ |
| Anular ventas | ❌ (recomendado) | ✅ |
| Dashboard | ❌ | ✅ |
| CRUD productos y categorías | ❌ | ✅ |
| Gestionar mesas, usuarios, ajustes, bloquear días | ❌ | ✅ |

Como el mesero también puede cobrar, cada venta guarda quién la registró y quién la cobró, y la anulación queda reservada al admin: es el control que evita que una venta cobrada desaparezca sin dejar rastro. Cambiar cualquier permiso es editar un solo archivo.

## 5. Reglas de negocio

### 5.1 Estados
- **Pedido**: `PENDIENTE → CONFIRMADO → ENTREGADO`; alternativas `RECHAZADO` y `CANCELADO`.
- **Reserva**: `PENDIENTE → CONFIRMADA → CUMPLIDA`; alternativas `RECHAZADA`, `CANCELADA`, `NO_LLEGO`.
- **Venta**: `PENDIENTE_COBRO → REALIZADA`; alternativa `ANULADA`.
- Las transiciones válidas viven en un módulo (`lib/estados.ts`); ningún otro código cambia estados directamente.

### 5.2 Mesas: estado derivado, no guardado
Nunca hay un campo "ocupada". Se calcula:

- **OCUPADA**: existe una `Venta` con esa mesa en `PENDIENTE_COBRO`.
- **RESERVADA**: existe una `Reserva` `CONFIRMADA` para hoy con esa mesa, y no está ocupada.
- **FUERA DE SERVICIO**: `habilitada = false`.
- **LIBRE**: en cualquier otro caso.

Efectos automáticos:
- Al **registrar una venta** en una mesa con reserva confirmada de hoy → la reserva pasa a `CUMPLIDA` y la mesa queda ocupada (por la venta abierta).
- Al **cobrar** (`REALIZADA`) → la mesa queda libre sola, porque ya no hay venta abierta.
- Las mesas y el sofá tienen **una cuenta abierta**: si el mesero registra otra venta en ellos, se agregan ítems a la existente (o se pide confirmar una cuenta aparte).
- La **barra** (`permiteVariasCuentas = true`, `reservable = false`) admite varias cuentas abiertas a la vez, una por cliente. Nunca se muestra como "ocupada": muestra cuántas cuentas abiertas tiene.
- Mesa no obligatoria en reservas. Con `personas` y `conMascota`, el panel sugiere mesas libres con capacidad suficiente y que acepten mascotas.

### 5.3 Reservas sin hora de salida
Solo se conoce la hora de llegada, así que no se puede garantizar exclusividad por franja. Reglas suaves:
- Pasada la hora + tolerancia configurable (`Ajuste: tolerancia_llegada_min`, por defecto 30), la reserva aparece resaltada como "posible no-show"; **el personal decide** marcar `NO_LLEGO` o esperar. No se cancela sola.
- Si otra reserva confirmada usa la misma mesa el mismo día en un margen de horas configurable, el panel **advierte**; no bloquea.

### 5.4 Eventos y días bloqueados
- Confirmar un evento `EN_LOCAL` crea una fila en `DiaBloqueado` **dentro de la misma transacción**. La clave primaria es la fecha: si dos personas confirman a la vez, el segundo intento falla y se muestra un mensaje claro.
- Cancelar el evento elimina el bloqueo. El admin también puede bloquear días manualmente (feriados, cierres).
- **Regla de cierre (confirmada):** un evento `EN_LOCAL` cierra el local al público solo si `personas >= capacidad total` (suma de la capacidad de las mesas `reservable` y `habilitada`; con las mesas actuales = 22). En ese caso, al confirmarlo se crea el `DiaBloqueado` y no se aceptan más reservas ese día. El panel avisa si ya hay reservas de mesa ese día para reubicarlas o rechazarlas (no se cancelan solas).
- Si el evento en el local es **menor** que la capacidad total, no bloquea el día: el admin le asigna las mesas necesarias (`ReservaMesa`) y el resto sigue disponible. Esas mesas cuentan como reservadas ese día.
- Al crear un evento, el servidor calcula y muestra al admin si cae en el caso de cierre; la decisión final de confirmar sigue siendo del admin.

### 5.5 Pedido → Venta
- Al marcar el pedido `ENTREGADO` (retiro o entrega), el servidor crea una `Venta` con `origen = PEDIDO_WEB`, copiando ítems y precios acordados.
- La venta nace `PENDIENTE_COBRO` y quien atiende el retiro la marca `REALIZADA` al cobrar (mesero o admin), eligiendo el método de pago.

### 5.6 Ventas y dinero
- Dinero en enteros (centavos de Bs). El **servidor** calcula totales a partir de los ítems y precios de la base; nunca acepta totales del cliente.
- Cada ítem copia nombre y precio al momento de vender: cambiar un precio después no altera el historial.
- Productos **no se borran**: se archivan (`activo = false`).
- Solo `REALIZADA` cuenta en el dashboard.
- Métodos de pago: **efectivo, QR y transferencia**. El registro es **manual**: quien cobra verifica el pago en su banco o billetera y elige el método. La web no integra pasarela ni confirma pagos automáticamente. `referenciaPago` es un campo opcional para anotar el número de transferencia o comprobante.
- Toda acción sensible (confirmar, cobrar, anular, bloquear día) escribe una fila en `Auditoria`.

### 5.7 Fechas y zona horaria
- Días de calendario: `@db.Date`. Horas de llegada: texto `"HH:mm"`.
- Interpretar "hoy" siempre en `America/La_Paz`, no en la zona del servidor (que suele ser UTC).

## 6. Seguridad (lista de verificación previa a publicar)

- [ ] Contraseñas con hash (Argon2 o bcrypt); nada de secretos en el repo. Usar variables de entorno.
- [ ] Sesiones con cookies `httpOnly`, `secure`, `sameSite`, `path=/panel`. **Regla para Route Handlers autenticados**: cualquier endpoint que necesite sesión (subida de imágenes, exportaciones) debe vivir bajo `/panel/...` (p. ej. `/panel/api/...`), **nunca** bajo `/api/...`, ya que el navegador solo enviará la cookie en rutas bajo `/panel`. Rate limit en login.
- [ ] Permisos verificados en servidor en **cada** acción y endpoint, no solo en el middleware de rutas.
- [ ] Zod en todos los endpoints públicos y privados; longitudes máximas en textos.
- [ ] Formularios públicos: Turnstile + honeypot + rate limit por IP y por teléfono.
- [ ] El mensaje de WhatsApp se arma con datos escapados/codificados (`encodeURIComponent`).
- [ ] Seguimiento y calendario público no filtran datos personales.
- [ ] Encabezados de seguridad (CSP, etc.) y HTTPS obligatorio.
- [ ] Backups automáticos de la base y prueba de restauración.
- [ ] Repositorio sin credenciales en el historial de git. Rotar cualquier secreto que se haya subido.
- [ ] Aviso de privacidad breve en los formularios (nombre y teléfono se guardan para gestionar el pedido).

## 7. Estructura de carpetas

```
app/
  (publico)/           inicio, menu, pedidos, eventos, reservas, seguimiento, contacto, nosotros
  (panel)/panel/       login, dashboard, ventas, pedidos, reservas, calendario, mesas, productos, ajustes
                       (y cualquier route handler que requiera sesión de personal, por Path=/panel)
  api/                 solo lo necesario y público/sin sesión de panel (webhooks, health); preferir Server Actions
components/
  ui/  publico/  panel/  ar/ (visor model-viewer)  pastel/ (ilustración y animaciones)
lib/
  db.ts  auth.ts  permisos.ts  estados.ts  fechas.ts  dinero.ts  whatsapp.ts  rate-limit.ts
  servicios/           pedidos.ts, reservas.ts, ventas.ts, mesas.ts, calendario.ts, productos.ts
  validaciones/        esquemas Zod por entidad
prisma/
  schema.prisma  migrations/  seed.ts
public/
  models/              .glb de ejemplo (los reales, en almacenamiento externo)
styles/                dolce.css, clay.css (migrados del sitio actual)
```

Principio: **la lógica de negocio vive en `lib/servicios/`**, no en componentes ni en rutas. Las acciones del panel y los formularios públicos llaman a los mismos servicios, así hay una sola implementación de cada regla.

## 8. Despliegue en Railway

- Un proyecto con dos servicios: `web` (Next.js, desde GitHub) y `postgres` (base de datos administrada de Railway).
- Variables: `DATABASE_URL`, `AUTH_SECRET`, `TURNSTILE_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITEKEY`, credenciales de Cloudinary/R2, `NEXT_PUBLIC_SITE_URL`.
- Comando de arranque: `prisma migrate deploy` antes de iniciar la app.
- Endpoint `GET /api/health` para el chequeo de salud.
- Dominio: al inicio, el subdominio gratuito de Railway para pruebas; **antes de lanzar, un dominio propio** (aporta confianza al cliente y estabilidad en enlaces y SEO).
- Backups: programar un `pg_dump` periódico a almacenamiento externo y probar restaurarlo. No confiar solo en la base como única copia.
- Vigilar el panel de consumo de Railway durante las primeras semanas para calibrar el costo real.

## 9. Plan por fases

1. **Migración y base**: Next.js + TypeScript, portar CSS/identidad y páginas actuales, Prisma, migraciones, `seed.ts` (categorías, productos, mesas).
2. **Público real**: menú desde la BD, pedidos/eventos/reservas que se guardan y abren WhatsApp, calendario con días bloqueados, seguimiento por código, Turnstile.
3. **Panel: acceso y gestión**: login de personal, permisos, bandeja de pedidos y reservas, confirmación, calendario, bloqueo de días, mesas.
4. **Ventas**: registro por mesa, cobro en caja, pedido → venta, auditoría.
5. **Dashboard y productos**: métricas (solo ventas realizadas), CRUD de productos con subida de imágenes.
6. **AR**: `ARViewer`, producción de modelos `.glb` a escala, pruebas en Android e iPhone.
7. **Producción**: dominio, backups, pruebas con los dueños, revisión de la lista de seguridad (§6), capacitación al personal.

Cada fase debe terminar con algo que funcione de punta a punta y se pueda probar.

## 10. Decisiones tomadas y pendientes

### Decididas
- Mesero y admin pueden marcar ventas como `REALIZADA`.
- Solo el admin confirma eventos. Los pedidos los confirman mesero y admin.
- Pago: efectivo, QR y transferencia, con registro manual (sin confirmación automática).
- Reservas solo para mesas y sofá; la barra no se reserva.
- Los clientes pueden ir con mascota (cafetería pet friendly) y hay tortas especiales para mascotas.
- Un evento `EN_LOCAL` bloquea el día solo si sus personas igualan o superan la capacidad total de mesas (§5.4); si es menor, reserva mesas puntuales. Un evento con entrega no bloquea nada.
- Las mascotas pueden estar en cualquier mesa (`aceptaMascotas = true` en todas).
- El local atiende de lunes a domingo (horas exactas por definir).

### Datos iniciales de mesas (`seed.ts`) — confirmado
| Nombre | Zona | Capacidad | Reservable |
|---|---|:---:|:---:|
| Mesa 1, Mesa 2, Mesa 3 | INTERIOR | 3 | ✅ |
| Mesa 4 | INTERIOR | 4 | ✅ |
| Terraza 1, Terraza 2 (fuera del local) | EXTERIOR | 2 | ✅ |
| Sofá | SOFA | 5 | ✅ |
| Barra | BARRA | 3 | ❌ (varias cuentas) |

Todas con `aceptaMascotas = true`.

### Datos del negocio (ya conocidos)
- Dirección: edificio Lar de Rosa, barrio Luis de Fuentes, zona Senac (ciudad por confirmar).
- Atención: lunes a domingo, 15:00 a 22:00. Última hora de llegada para reservar: 21:30. Guardar como `Ajuste` (`hora_apertura`, `hora_cierre`, `ultima_llegada`) para editarlo desde el panel.
- Instagram: instagram.com/dolceflorencia. Logo oficial: el fucsia "Dolce Florencia — Pastelería" (`public/brand/logo-pasteleria.png`; pendiente versión SVG).
- Ubicación: mapa embebido de Google Maps (coordenadas aprox. -21.5417, -64.7415). Requiere permitir `frame-src https://www.google.com` en el CSP.
- Menú real cargado en `prisma/menu-data.ts` (17 categorías (65 productos), precios en Bs).
- WhatsApp real: 78198181 → `59178198181`. **Para pruebas** usar `59157901443` (variable de entorno `WHATSAPP_NUMERO`, nunca escrito en el código; cambiar al real solo al lanzar).
- Facebook: facebook.com/dolceflorenci (ojo: sin la "a" final).

### Pendientes
1. Versión SVG del logo (hoy solo hay PNG).
2. Fotos originales de los productos y del local.
3. Descripción corta del local para la página de inicio.
4. Definir si un día de cierre por evento afecta también las ventas de salón (hoy solo bloquea reservas).

## 11. Instrucciones para el agente (Antigravity)

- Trabajar **una fase a la vez** y explicar qué se cambió antes de pasar a la siguiente.
- No modificar reglas de negocio de §5 sin avisar; si algo es ambiguo, preguntar.
- Toda regla de negocio va en `lib/servicios/` y toda mutación con permisos pasa por `puede()`.
- Nunca confiar en totales, precios o roles enviados desde el cliente.
- Nunca usar `localStorage` para sesión o datos sensibles.
- Escribir pruebas para: transiciones de estado, bloqueo de días, cobro y estado derivado de mesas.
- Conservar la identidad visual y accesibilidad descritas en `BRAND.md` (contraste, `prefers-reduced-motion`, foco visible).
- Sin dependencias nuevas sin justificarlas.
