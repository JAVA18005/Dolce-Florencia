# Dolce Florencia · Identidad visual

**El arte de celebrar en dulce.** Una pastelería cálida y delicada: pequeños antojos y grandes ocasiones reciben el mismo cuidado. El lenguaje habla de compartir, imaginar y recordar; evita promesas de historia, certificaciones o servicios todavía no verificados.

## Sello y logotipo

`assets/florencia-mark.svg` es el símbolo vectorial original: una flor que evoca una roseta de crema, con un monograma DF. El nombre se compone en Cormorant Garamond y el descriptor en DM Sans. La web incluye el conjunto en cabecera y pie; el símbolo también funciona como favicon.

Usar el sello dorado sobre oliva. Mantener alrededor un espacio libre equivalente al círculo central; evitar deformarlo o añadir sombras fuertes. Para impresión, preparar artes finales con el nombre convertido a contornos y verificar el color en una prueba física.

## Paleta

| Color | HEX | Uso |
|---|---|---|
| Oliva aterciopelado | `#293D32` | Cabecera, pie, bloques de marca y botones |
| Oliva profundo | `#203229` | Profundidad y contraste |
| Dorado mantequilla | `#DBBF84` | Logotipo, titulares sobre oscuro y acentos |
| Crema | `#F6F0E4` | Fondo principal |
| Papel | `#FFFBF3` | Formularios y superficies claras |
| Salvia | `#9EAA87` | Volúmenes decorativos |
| Cereza | `#943E3F` | Énfasis, numeración y cinta de caramelo |
| Tinta | `#2E4034` | Lectura sobre crema |

El dorado tiene función ornamental sobre crema; los textos de lectura usan tinta. El rojo es un acento, no el fondo predominante.

## Tipografía y formas

- Cormorant Garamond: titulares, frases en cursiva y nombre de marca.
- DM Sans: navegación, etiquetas, descripciones y formularios.
- Georgia y Segoe UI: alternativas cuando no cargan Google Fonts.
- Arcos de vitrina, bordes suaves, iluminación interior y sombras discretas sugieren crema y fondant.
- El espacio y la composición construyen la identidad sin encerrar cada texto en una tarjeta.

## Movimiento

El pastel es una ilustración vectorial por capas con volumen simulado, no un modelo WebGL. En el inicio se puede desarmar y armar con un botón. La sección del ritual sincroniza la separación de capas, la rotación y la forma de su fondo con el scroll nativo, sin secuestrar la navegación.

La transición entre portada y contenido usa gotas de glaseado que se estiran con el scroll. Botones y filtros tienen relieve y compresión al pulsarlos; las tarjetas se elevan e inclinan siguiendo el cursor. Rosetas y macarons flotan alrededor del pastel. Las partículas ambientales de crema reaccionan al cursor en los márgenes de inicio y nuestra esencia. Existe un control de pausa persistente y se respeta `prefers-reduced-motion`. Con movimiento reducido, el pastel permanece armado y el contenido sigue accesible.

## Dirección fotográfica

Fotografías con luz lateral suave, fondos crema u oliva, platos cerámicos y encuadres cercanos. Evitar fondos muy saturados y marcas ajenas. Usar imágenes con licencia adecuada.

Las claves de `js/config.js` conectan cada imagen con su marco: `clasica`, `cheesecake`, `chocolate`, `cupcake`, `tiramisu`, `canina`, `atelier`, `celebration`. Las tarjetas aceptan recortes verticales o cuadrados y usan `object-fit: cover`. Sin imagen, o si falla su carga, queda la ilustración integrada. Las ilustraciones no representan fotografías de productos reales.

## Alcance

Identidad digital y experiencia pública en siete páginas. El catálogo es orientativo y debe validarse con el negocio. Pedidos, eventos y consultas se preparan para WhatsApp. No existe todavía panel administrativo, base de datos, control de disponibilidad ni almacenamiento de pedidos; el cierre operativo se hace en la conversación.

