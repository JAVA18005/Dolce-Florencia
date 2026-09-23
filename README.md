# Dolce Florencia

Sitio público de pastelería con identidad oliva, crema, dorado y cereza; pastel vectorial interactivo, catálogo filtrable y consultas preparadas para WhatsApp.

## Ver localmente

Con Node.js instalado, ejecutar `node scripts/serve.js` y abrir `http://127.0.0.1:4173`. También se puede abrir `index.html` directamente; si el navegador no permite copiar al portapapeles, el mensaje se selecciona para copiar manualmente.

## Editar

- `scripts/build-pages.js`: contenido y componentes compartidos. Ejecutar `node scripts/build-pages.js` para regenerar las siete páginas HTML.
- `css/dolce.css`: sistema visual y estilos adaptativos.
- `js/dolce.js`: navegación, animaciones, filtros y preparación del mensaje.
- `js/config.js`: número, modo demostración, fotografías, dirección y horarios.
- `BRAND.md`: guía de marca, paleta y dirección fotográfica.
- `assets/florencia-mark.svg`: sello floral y monograma vectorial.

Las páginas HTML generadas se incluyen y no necesitan dependencias para servirlas. Google Fonts es opcional; hay tipografías de respaldo.

## Configurar fotografías

En `js/config.js`, colocar una ruta local (por ejemplo `assets/torta.webp`) o una URL HTTPS en la clave correspondiente dentro de `images`. Dejar `''` conserva la ilustración. Se recomienda WebP de tamaño razonable y encuadre centrado. Los marcos incluyen descripción accesible, carga diferida y respaldo si la imagen falla.

## Activar WhatsApp

El número `59170000000` es ficticio y `demo: true` impide abrir una conversación con él. En este modo se muestra el mensaje para revisarlo y copiarlo.

Antes de publicar, reemplazar `whatsapp` por el número real de Bolivia (591 + 8 dígitos) y establecer `demo: false`. El formulario abrirá `wa.me` con el texto codificado. El cliente debe enviar el mensaje en WhatsApp; la web nunca confirma un pedido automáticamente ni procesa pagos. No se almacenan datos personales en el sitio.

Validar con la pastelería nombres de productos, ingredientes, servicios ofrecidos, dirección y horarios. Se retiraron de la experiencia pública precios, direcciones, estados de pedido y disponibilidad de ejemplo de la maqueta anterior.

## Estado funcional

Esta entrega cubre la web pública. No incluye servidor de gestión, autenticación ni panel administrativo. La confirmación de pedidos y eventos se realiza manualmente en WhatsApp. `propuesta-tecnica-dolce-florencia.md` se conserva como documento histórico; sus funciones previstas no representan funciones implementadas.

Comprobaciones: sintaxis de JavaScript, enlaces locales, interacción del pastel, menú móvil, filtro del catálogo, traslado del producto al formulario y preparación del mensaje en modo demostración. Revisión de composición en escritorio y móvil.

## Capa claymórfica

Los materiales y microinteracciones se encuentran en css/clay.css y js/clay.js. Las partículas se dibujan en canvas a un máximo aproximado de 30 fps y densidad de píxeles 1.5, con 8 gotas por escena móvil y 19 en escritorio. El bucle se detiene fuera de pantalla, al ocultar la pestaña o al pausar el movimiento. No hay dependencias adicionales.

