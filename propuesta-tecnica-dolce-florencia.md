# Propuesta Técnica — Dolce Florencia Web
Documento interno del equipo para guiar el desarrollo (no forma parte del informe oficial, es la base de la que sale el contenido de cada informe diario).

## 1. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Estructura | HTML5 semántico + Vite (multi-page app) | Cada sección es un `.html` propio que carga su bundle de React — cumple con el requisito de "páginas" de la rúbrica sin perder las ventajas de componentes |
| Estilos | CSS3 + Bootstrap 5 | Grillas responsivas rápidas, se personaliza con variables CSS |
| Interactividad | **React + JavaScript** (sin jQuery) | Componentes reutilizables (tarjetas de producto, carrito, calendario) entre páginas |
| Animaciones | Anime.js, integrado vía un hook `useScrollAnimation` (refs + `IntersectionObserver`) | El efecto "se arma/desarma con el scroll" de animejs.com, controlado desde React sin pelear con su ciclo de render |
| Calendario de reservas | FullCalendar.js (o un componente propio simple) envuelto en un componente React | Rápido de integrar, buena UX |
| Realidad aumentada | `<model-viewer>` de Google, usado directo en JSX (`<model-viewer src="..." ar />`) | Web component nativo, no pelea con React; funciona en navegador móvil (iOS/Android) con modelos `.glb`/`.usdz`, sin SDKs de AR complejos |
| Cálculo de distancia/tiempo de entrega | Geolocation API del navegador + fórmula de Haversine, encapsulado en un hook `useDeliveryEstimate`, con el cálculo **recalculado también en el backend** antes de guardar el pedido | El frontend no es confiable como única fuente de verdad: alguien podría manipular el valor antes de enviarlo |
| Simulación de delivery | Estado del pedido persistido en la base de datos, actualizado por un job simple (`setTimeout`/cron ligero) en el backend | Así el estado sobrevive a que el cliente recargue la página o cierre el navegador |
| Backend | Node.js + Express | Se integra bien con el resto del stack en JS/React, y es lo que ya conocen de otros proyectos |
| Base de datos | SQLite (vía Prisma como ORM) | Simple de levantar sin infraestructura extra; con Prisma, migrar a Postgres más adelante es cambiar una línea de configuración, no reescribir el código |
| Registro/autenticación de clientes | JWT + contraseñas hasheadas con bcrypt | Estándar simple de implementar a mano sin depender de un proveedor externo |
| Hosting | Railway (frontend estático + servicio backend + volumen para la DB) | Ya lo usaron antes en el proyecto "mi barrio", conocen el flujo |

> Nota sobre el AR: si en algún momento quieren algo más inmersivo que `model-viewer` (por ejemplo colocar el postre sobre una mesa real vía cámara con más control), la alternativa es **AR.js** o **8th Wall**, pero tienen más curva de aprendizaje y 8th Wall es de pago. Para el nivel de este curso, `model-viewer` es la opción más realista de completar a tiempo.

## 2. Estructura de carpetas propuesta (multi-página con React)

Cada sección del sitio es un `.html` independiente en la raíz, y cada uno monta su propio árbol de React desde `src/pages/<seccion>/main.jsx`. Los componentes, hooks y utilidades se comparten entre todas las páginas.

```
dolce-florencia-web/
├── index.html              # Inicio
├── nosotros.html
├── menu.html
├── pedidos.html
├── reservas.html
├── seguimiento.html
├── contacto.html
│
├── package.json
├── vite.config.js          # configurado como multi-page app (rollupOptions.input con cada .html)
│
├── src/
│   ├── pages/
│   │   ├── inicio/
│   │   │   ├── main.jsx     # punto de entrada que monta <App /> en el div de index.html
│   │   │   └── App.jsx
│   │   ├── nosotros/
│   │   │   ├── main.jsx
│   │   │   └── App.jsx
│   │   ├── menu/
│   │   │   ├── main.jsx
│   │   │   └── App.jsx
│   │   ├── pedidos/
│   │   │   ├── main.jsx
│   │   │   └── App.jsx
│   │   ├── reservas/
│   │   │   ├── main.jsx
│   │   │   └── App.jsx
│   │   ├── seguimiento/
│   │   │   ├── main.jsx
│   │   │   └── App.jsx
│   │   └── contacto/
│   │       ├── main.jsx
│   │       └── App.jsx
│   │
│   ├── components/          # compartidos entre páginas
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ProductCard.jsx
│   │   ├── ARViewer.jsx      # wrapper de <model-viewer>
│   │   └── ReservationCalendar.jsx
│   │
│   ├── hooks/
│   │   ├── useScrollAnimation.js   # integra Anime.js con refs + IntersectionObserver
│   │   └── useDeliveryEstimate.js  # Geolocation + Haversine
│   │
│   ├── utils/
│   │   ├── haversine.js
│   │   └── deliverySimulation.js
│   │
│   ├── data/
│   │   └── products.js       # catálogo (nombre, precio, modelo 3D, categoría, apto-perros)
│   │
│   └── styles/
│       ├── variables.css     # paleta de marca Dolce Florencia
│       └── global.css
│
├── public/
│   ├── models/                # modelos 3D .glb/.usdz de los postres para AR
│   └── img/
│
├── docs/
│   └── informes/               # un .md por cada informe diario de avance
│
└── README.md
```

## 3. Desglose de funcionalidades clave

### Menú con Realidad Aumentada
- El componente `ARViewer` recibe la ruta del modelo `.glb` y renderiza `<model-viewer ar ar-modes="scene-viewer webxr quick-look">`.
- Cada `ProductCard` incluye un botón "Ver en tu mesa" que abre el `ARViewer` en modal.
- Para el curso, basta con 3–4 modelos de referencia (torta redonda, cheesecake, cupcake, torta para perro) reutilizando geometría con distintas texturas si el tiempo apremia.

### Pedidos + cálculo de entrega por distancia
1. El hook `useDeliveryEstimate` pide la ubicación con la Geolocation API (o el cliente ingresa dirección manualmente como fallback).
2. Calcula la distancia en línea recta con Haversine (`utils/haversine.js`).
3. Estima el tiempo con una velocidad promedio configurable (ej. 25 km/h en zona urbana) más un tiempo base de preparación.
4. El componente de checkout en `pages/pedidos/App.jsx` muestra el resultado antes de confirmar.

### Simulación de delivery
- La página de Seguimiento usa un estado (`useState`) que avanza automáticamente por `pendiente → preparando → en camino → entregado` con `useEffect` + `setTimeout`, dando la sensación de un sistema real sin necesidad de backend con repartidores reales.

### Reservas con calendario
- `ReservationCalendar` permite elegir fecha, hora y tipo de ubicación: mesa estándar, sillón, o zona pet-friendly (con nota de que puede asistir con su perro).
- Confirmación visual + resumen de la reserva al enviar el formulario.

## 4. Backend, Base de Datos y Registro de Clientes

### Estructura del backend

```
dolce-florencia-api/
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── productos.routes.js
│   │   ├── pedidos.routes.js
│   │   └── reservas.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── productos.controller.js
│   │   ├── pedidos.controller.js
│   │   └── reservas.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js      # valida el JWT en rutas protegidas
│   │   ├── validate.middleware.js  # validación de inputs (zod)
│   │   └── errorHandler.middleware.js
│   ├── services/
│   │   └── delivery.service.js     # recalcula distancia/tiempo del lado del servidor
│   └── utils/
│       └── haversine.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env.example
├── package.json
└── README.md
```

### Modelo de datos (Prisma / SQLite)

| Tabla | Campos clave |
|---|---|
| `usuarios` | id, nombre, email (único), password_hash, telefono, direccion_default, tiene_mascota, rol (`cliente` \| `admin`), created_at |
| `productos` | id, nombre, descripcion, precio, categoria, apto_perros, modelo_ar_url, imagen_url, stock |
| `pedidos` | id, usuario_id, estado (`pendiente`→`preparando`→`en_camino`→`entregado`), direccion_entrega, lat, lng, distancia_km, tiempo_estimado_min, total, created_at |
| `pedido_items` | id, pedido_id, producto_id, cantidad, precio_unitario |
| `reservas` | id, usuario_id, fecha, hora, tipo_ubicacion (`mesa` \| `sillon` \| `pet_friendly`), num_personas, con_mascota, estado (`confirmada` \| `cancelada`), created_at |

### Registro y autenticación de clientes

1. **Registro** (`POST /api/auth/register`): el cliente envía nombre, email, contraseña, teléfono. El backend valida el formato, verifica que el email no exista, hashea la contraseña con bcrypt y crea el usuario.
2. **Login** (`POST /api/auth/login`): compara el hash y devuelve un JWT (con `id` y `rol` en el payload).
3. El frontend guarda el JWT y lo manda en el header `Authorization: Bearer <token>` en cada request a `/api/pedidos` y `/api/reservas`.
4. `auth.middleware.js` valida el token en esas rutas protegidas; sin token válido, la API responde 401.
5. El rol `admin` (asignado manualmente en la base para el equipo/dueños) desbloquea endpoints de gestión (ver/actualizar estado de pedidos y reservas) — es la base de un futuro Panel Administrativo.

> Nota de seguridad: guardar el JWT en `localStorage` es lo más simple de implementar, pero es vulnerable a XSS. Si el tiempo alcanza, una cookie `httpOnly` es más segura — pero requiere configurar CORS con `credentials: true` entre frontend y backend, así que es una mejora para después de tener el flujo básico funcionando.

## 5. Consideraciones para Producción

Estas son las cosas que suelen faltar en un proyecto de curso pero que marcan la diferencia entre una maqueta y algo que de verdad podría usar la pastelería:

- **Variables de entorno:** `JWT_SECRET`, `DATABASE_URL`, `PORT`, `CORS_ORIGIN` van en `.env` (nunca en el código) y se configuran como variables de entorno del servicio en Railway, no se suben al repo.
- **Persistencia de la base en Railway:** el sistema de archivos del contenedor es efímero — si el archivo SQLite no está en un **Volume** de Railway, se pierde la base en cada redeploy. Hay que crear el volumen y apuntar `DATABASE_URL` ahí. Si en algún punto el tráfico real lo justifica, migrar a Postgres (addon nativo de Railway) es más robusto para escrituras concurrentes que SQLite.
- **Imágenes y modelos 3D:** no conviene guardarlos sueltos en el filesystem del backend por la misma razón (se pierden sin volumen). Mejor subirlos a un servicio como Cloudinary (tiene tier gratuito) o a un volumen dedicado.
- **Validación de inputs:** cada endpoint valida lo que recibe (con zod o similar) antes de tocar la base — nunca confiar en lo que manda el frontend.
- **Rate limiting:** en `/api/auth/login` y `/api/auth/register` especialmente, para frenar intentos de fuerza bruta (`express-rate-limit`).
- **CORS:** en producción, restringir el `origin` permitido al dominio real del frontend, no dejarlo abierto a `*`.
- **HTTPS:** automático en el dominio que da Railway, así que no hay que configurarlo a mano.
- **Manejo de errores centralizado:** un middleware de errores que capture excepciones y devuelva respuestas consistentes, más logging (aunque sea con `morgan`) para poder depurar en producción.
- **Datos personales de clientes:** dirección, teléfono y ubicación son datos sensibles — evitar loguearlos en texto plano y limitar quién puede leerlos (solo el propio cliente y el rol `admin`).
- **Backups de la base:** aunque sea un proyecto de curso, conviene exportar el volumen SQLite periódicamente (manual o con un script simple) antes de cada demo o entrega importante, para no perder datos de prueba por un redeploy mal hecho.
- **Seeds de datos de prueba:** un script (`prisma/seed.js`) que cargue productos, un usuario admin y algunos pedidos/reservas de ejemplo, para que cada integrante del equipo (y el docente) pueda levantar el proyecto con datos reales sin tener que cargarlos a mano.
- **Health check:** un endpoint simple (`GET /api/health`) que devuelva `200 OK`, útil para que Railway confirme que el servicio backend sigue vivo y para depurar rápido si algo se cae después de un deploy.

## 6. Roadmap sugerido por sesión (para que cada informe diario tenga contenido claro)

| Día | Entregable |
|---|---|
| 1 | Planteamiento, arquitectura de información, maqueta base HTML/Bootstrap |
| 2 | Setup de Vite multi-page + React, componentes base (Navbar/Footer), primer formulario funcional |
| 3 | Integración de Anime.js vía `useScrollAnimation`: animaciones de scroll en Inicio y transiciones entre secciones |
| 4 | Setup del backend (Express + Prisma + SQLite), modelo de datos, endpoints de registro/login con JWT |
| 5 | Cálculo de distancia/tiempo de entrega (frontend + recálculo en backend) + simulación de estados de delivery persistida en la DB |
| 6 | `ARViewer` con `model-viewer` en el catálogo |
| 7 | `ReservationCalendar` funcional, conectado a `/api/reservas` |
| 8 | Deploy en Railway (frontend + backend + volumen), variables de entorno, pruebas end-to-end |
| 9 | Pulido visual, responsive final, rate limiting/CORS/manejo de errores, documentación |

Ajusten los días según el cronograma real que les dé el docente; el orden está pensado para que cada entrega dependa solo de lo ya construido. Se agregaron los días 4 y 8 respecto a la versión anterior del roadmap, ya que ahora el proyecto incluye backend, base de datos y deploy con persistencia real — antes esas tareas no estaban contempladas como entregables propios.
