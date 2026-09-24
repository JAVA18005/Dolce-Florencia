# Dolce Florencia · Identidad visual (v2)

**El arte de celebrar en dulce.** Una cafetería y pastelería cálida, con la piedra y la vegetación de su fachada, el rosa de su logotipo y un trato cercano. Es pet friendly, y eso también forma parte de su personalidad. El lenguaje habla de compartir, imaginar y recordar; evita promesas de historia, certificaciones o servicios no verificados.

> Esta versión reemplaza la paleta anterior (oliva, crema, dorado y cereza) por una tomada de la fachada y del logotipo reales del local.

## Paleta

| Rol | Nombre | HEX | Uso |
|---|---|---|---|
| Fondo principal | Rosa pastel | `#F7EBE8` | Fondo de página y de secciones |
| Superficie | Hueso | `#FFFAF7` | Tarjetas, formularios, espacios amplios de lectura |
| Texto y superficies oscuras | Café piedra | `#3D3330` | Texto principal, títulos, cabecera y pie oscuros |
| Café profundo | — | `#2B2320` | Profundidad, sombras, fondo del pie |
| Acento decorativo | Fucsia | `#D94F80` | Iconos, detalles, bordes, elementos grandes, hover |
| Acento de acción | Fucsia profundo | `#B8386A` | **Botones con texto, enlaces y etiquetas** |
| Secundario | Verde olivo | `#6B7A5E` | Tarjetas de producto, banners, viñetas |
| Olivo profundo | — | `#56634B` | Estados hover/activos del olivo, texto blanco encima |
| Texto secundario | Café suave | `#6F5F59` | Descripciones, notas, texto de apoyo |
| Líneas | Rosa arena | `#E4D0CA` | Bordes y separadores |

### Contraste (WCAG) — por qué hay dos fucsias

El fucsia del logotipo, `#D94F80`, es bonito pero **no tiene contraste suficiente para texto pequeño**:

| Combinación | Contraste | Resultado |
|---|:---:|---|
| Texto blanco sobre `#D94F80` | 3,9 : 1 | ❌ No cumple AA en texto normal (pide 4,5); solo sirve en texto grande |
| `#D94F80` como texto sobre `#F7EBE8` | 3,35 : 1 | ❌ No usar para texto |
| Texto blanco sobre `#B8386A` | 5,5 : 1 | ✅ |
| `#B8386A` como texto sobre `#F7EBE8` | 4,7 : 1 | ✅ |
| `#3D3330` sobre `#F7EBE8` | 10,5 : 1 | ✅ |
| `#6F5F59` sobre `#F7EBE8` | 5,2 : 1 | ✅ |
| Blanco sobre olivo `#6B7A5E` | 4,6 : 1 | ✅ (justo; para texto pequeño preferir `#56634B`, 6,4 : 1) |
| `#F7EBE8` sobre `#3D3330` | 10,5 : 1 | ✅ |
| `#D94F80` sobre `#3D3330` | 3,1 : 1 | ❌ En fondos oscuros usar rosa pastel para el texto |

**Regla:** `#D94F80` es para lo decorativo o lo grande (iconos, ilustración, bordes, textos de 24 px o más). Todo botón o enlace con texto usa `#B8386A`. El olivo es fondo con texto blanco; no se usa como color de texto sobre rosa pastel (3,9 : 1).

### Tokens CSS

Reemplazan el bloque `:root` de `css/dolce.css`:

```css
:root {
  --rosa: #F7EBE8;
  --hueso: #FFFAF7;
  --cafe: #3D3330;
  --cafe-deep: #2B2320;
  --cafe-suave: #6F5F59;
  --fucsia: #D94F80;
  --fucsia-accion: #B8386A;
  --olivo: #6B7A5E;
  --olivo-deep: #56634B;
  --linea: #E4D0CA;

  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'DM Sans', 'Segoe UI', sans-serif;
}
```

Equivalencia con la paleta anterior, para migrar los estilos existentes:

| Antes | Ahora |
|---|---|
| `--cream` `#F6F0E4` (fondo) | `--rosa` |
| `--paper` `#FFFBF3` (superficies) | `--hueso` |
| `--ink` `#2E4034` (texto) | `--cafe` |
| `--muted` `#6B7061` | `--cafe-suave` |
| `--olive` / `--olive-deep` (cabecera, pie, botones) | `--cafe` / `--cafe-deep` (superficies) y `--fucsia-accion` (botones) |
| `--sage` `#9EAA87` | `--olivo` |
| `--gold` `#DBBF84` | rosa pastel `--rosa` (texto sobre oscuro) o `--fucsia` (detalle) |
| `--cherry` `#943E3F` | `--fucsia-accion` |
| `--line` `#DCD7C7` | `--linea` |

Los colores del pastel vectorial y de las gotas de glaseado están escritos directamente en `scripts/build-pages.js` y `css/clay.css`, no en variables. Hay que recolorearlos con la nueva paleta (bizcocho hueso, crema rosa, fresas y detalles en fucsia, hojas en olivo).

## Sello y logotipo

`assets/florencia-mark.svg` es un sello provisional (dorado sobre oliva), creado antes de tener el logotipo real. Debe **sustituirse por el logotipo original de la cafetería** (SVG o PNG de alta resolución). Mientras no llegue, no mezclar el sello dorado con la paleta nueva. Conservar espacio libre alrededor del logotipo, no deformarlo y no aplicarle sombras fuertes.

## Tipografía y formas

- Cormorant Garamond: titulares, frases en cursiva y nombre de marca.
- DM Sans: navegación, etiquetas, descripciones y formularios.
- Georgia y Segoe UI: alternativas cuando no cargan Google Fonts.
- Arcos de vitrina, bordes suaves y sombras discretas sugieren crema y fondant. Las tarjetas de producto pueden usar el olivo para dar frescura sin competir con el rosa.
- El espacio y la composición construyen la identidad sin encerrar cada texto en una tarjeta.

## Movimiento

El pastel es una ilustración vectorial por capas, no un modelo WebGL. En el inicio se puede desarmar y armar con un botón, y la sección del ritual sincroniza la separación de capas con el scroll nativo, sin secuestrar la navegación.

La transición entre portada y contenido usa gotas de glaseado que se estiran con el scroll. Botones y filtros tienen relieve y compresión al pulsarlos; las tarjetas se elevan e inclinan siguiendo el cursor. Las partículas ambientales reaccionan al cursor. Existe un control de pausa persistente y se respeta `prefers-reduced-motion`. Con movimiento reducido, el pastel permanece armado y el contenido sigue accesible.

## Dirección fotográfica

Luz natural suave, fondos rosa pastel, hueso o piedra, toques de vegetación (hojas, plantas) y platos cerámicos. Encuadres cercanos. Incluir a las mascotas cuando se pueda, con permiso de sus dueños: es parte de la experiencia del local. Evitar fondos muy saturados y marcas ajenas. Usar solo fotografías propias o con licencia adecuada.

Las claves de `js/config.js` conectan cada imagen con su marco. En la versión de producción las fotos vendrán de la base de datos (campo `imagenUrl` del producto), editables desde el panel.

## Alcance

Esta guía cubre la identidad visual de la web pública y del panel interno. El panel usa los mismos tokens, con más sobriedad: superficies hueso, texto café y acciones en fucsia profundo. Ver `ARQUITECTURA.md` para el alcance funcional.
