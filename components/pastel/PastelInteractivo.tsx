'use client';

import { useState } from 'react';

interface PastelProps {
  mini?: boolean;
  mostrarBotonDesarmar?: boolean;
}

export default function PastelInteractivo({
  mini = false,
  mostrarBotonDesarmar = false,
}: PastelProps) {
  const [desarmado, setDesarmado] = useState(false);

  const sufijo = mini ? 'mini' : 'full';

  return (
    <div className={`hero-visual ${desarmado ? 'exploded' : ''}`}>
      {!mini && <div className="hero-halo" aria-hidden="true" />}
      {!mini && (
        <span className="orbit-note" aria-hidden="true">
          PEQUEÑAS CAPAS · GRANDES MOMENTOS
        </span>
      )}

      <div className={`cake-art ${mini ? 'mini' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 600 610" fill="none">
          <defs>
            {/* Glaseado crema / hueso y rosa pastel */}
            <linearGradient
              id={`icing-${sufijo}`}
              x1="160"
              y1="180"
              x2="470"
              y2="400"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFFAF7" />
              <stop offset=".5" stopColor="#F7EBE8" />
              <stop offset="1" stopColor="#E4D0CA" />
            </linearGradient>

            {/* Capa de olivo suave */}
            <linearGradient
              id={`olivo-${sufijo}`}
              x1="145"
              y1="260"
              x2="470"
              y2="380"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#819173" />
              <stop offset=".5" stopColor="#6B7A5E" />
              <stop offset="1" stopColor="#56634B" />
            </linearGradient>

            {/* Fresas y frutos en fucsia / fucsia profundo de marca */}
            <linearGradient id={`berry-${sufijo}`}>
              <stop stopColor="#E66595" />
              <stop offset=".5" stopColor="#D94F80" />
              <stop offset="1" stopColor="#B8386A" />
            </linearGradient>

            {/* Sombra en café profundo */}
            <filter
              id={`shadow-${sufijo}`}
              x="-40%"
              y="-40%"
              width="180%"
              height="200%"
            >
              <feDropShadow
                dx="0"
                dy="16"
                stdDeviation="13"
                floodColor="#2B2320"
                floodOpacity=".25"
              />
            </filter>
          </defs>

          {/* Sombra de contacto */}
          <ellipse cx="300" cy="523" rx="217" ry="32" fill="#2B2320" opacity=".2" />

          {/* Plato cerámico */}
          <g className="cake-plate">
            <path d="M88 483v14c0 36 424 36 424 0v-14" fill="#3D3330" />
            <ellipse cx="300" cy="483" rx="212" ry="48" fill="#E4D0CA" />
            <ellipse cx="300" cy="479" rx="190" ry="36" stroke="#3D3330" strokeWidth="1" />
          </g>

          {/* Capa Base */}
          <g className="cake-layer layer-base" filter={`url(#shadow-${sufijo})`}>
            <path
              d="M148 349v100c0 65 304 65 304 0V349"
              fill={`url(#icing-${sufijo})`}
            />
            <ellipse cx="300" cy="349" rx="152" ry="48" fill="#FFFAF7" />
            <path
              d="M150 404c55 50 240 48 300 0v13c-72 47-226 47-300 0"
              fill="#B8386A"
            />
            <path
              d="M168 435v14m18-8v14m20-7v14m20-8v13m20-9v14m22-11v14m22-13v14m22-14v14m22-15v14m22-17v14m22-20v14m22-22v14m22-26v14"
              stroke="#D94F80"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Capa Media */}
          <g className="cake-layer layer-middle" filter={`url(#shadow-${sufijo})`}>
            <path
              d="M164 275v86c0 60 272 60 272 0v-86"
              fill={`url(#olivo-${sufijo})`}
            />
            <ellipse cx="300" cy="275" rx="136" ry="42" fill="#7A896D" />
            <path
              d="M166 322c72 38 190 38 268 0"
              stroke="#FFFAF7"
              strokeWidth="9"
            />
            <path
              d="M182 286v49m17-43v47m18-42v47m20-44v49m21-47v47m22-47v50m23-49v49m23-49v47m23-49v48m21-52v47m20-52v47m19-53v47m15-54v44"
              stroke="#56634B"
              strokeOpacity=".6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* Capa Superior */}
          <g className="cake-layer layer-top" filter={`url(#shadow-${sufijo})`}>
            <path
              d="M184 204v78c0 54 232 54 232 0v-78"
              fill={`url(#icing-${sufijo})`}
            />
            <ellipse cx="300" cy="204" rx="116" ry="36" fill="#FFFAF7" />
            {/* Gotas de glaseado rosa */}
            <path
              d="M184 206c5 12 12 15 17 8 10-14 20-9 21 7v22c0 14 15 15 15 0v-11c0-11 18-13 22 0 5 15 17 10 19-1 3-12 19-10 19 3v22c0 15 17 15 18 0l1-20c1-13 18-17 22-5 5 15 18 11 20 0 3-14 16-19 21-11 9 11 25-3 37-14"
              fill="#F7EBE8"
            />
          </g>

          {/* Decoración: Fresas y perlas */}
          <g className="cake-layer layer-decoration">
            <g fill={`url(#berry-${sufijo})`}>
              <path d="M244 189c-18-9-22-32-9-39 15-9 37 5 34 20-2 10-15 21-25 19Z" />
              <path d="M293 177c-21-10-21-37-7-44 17-9 37 8 33 24-3 11-16 22-26 20Z" />
              <path d="M340 193c-15-8-17-30-4-37 16-8 36 3 32 20-2 10-19 19-28 17Z" />
            </g>
            <g stroke="#FFFAF7" strokeWidth="2" strokeLinecap="round">
              <path d="m242 161 2 3m8 9 2 3m-18-3 2 3m52-29 2 3m12 6 2 3m-17 4 2 3m50 2 2 3m12 0 2 3" />
            </g>
            {/* Hojas en verde olivo */}
            <path
              d="M294 137c-22-6-29-24-17-32 13 0 19 16 17 32Zm4-3c-4-27 14-36 27-29 2 14-9 25-27 29Zm-51 16c-12-12-27-13-34-3 5 12 21 14 34 3Zm95 7c-6-20 11-27 23-21-1 12-10 21-23 21Z"
              fill="#56634B"
            />
            {/* Perlas de azúcar crema hueso */}
            <g fill="#FFFAF7">
              <circle cx="211" cy="199" r="13" />
              <circle cx="234" cy="210" r="13" />
              <circle cx="260" cy="220" r="13" />
              <circle cx="290" cy="224" r="13" />
              <circle cx="320" cy="223" r="13" />
              <circle cx="349" cy="217" r="13" />
              <circle cx="376" cy="207" r="13" />
              <circle cx="394" cy="194" r="12" />
            </g>
          </g>
        </svg>
      </div>

      {!mini && (
        <>
          <span className="visual-note note-one" aria-hidden="true">
            un poquito
            <br />
            <em>de magia</em>
            <svg viewBox="0 0 70 45">
              <path d="M5 5Q5 35 60 35m-10-8 12 8-12 5" />
            </svg>
          </span>
          <span className="visual-note note-two" aria-hidden="true">
            el toque
            <br />
            Florencia ✳
          </span>
          <div className="hero-seal" aria-hidden="true">
            HECHO
            <br />
            <strong>con amor</strong>
            <br />
            PARA TI
          </div>
          <div className="confections" aria-hidden="true">
            <span className="confection cream-rosette">
              <i />
              <i />
              <i />
            </span>
            <span className="confection clay-macaron" />
            <span className="confection sugar-pearl" />
          </div>
        </>
      )}

      {mostrarBotonDesarmar && (
        <button
          className="cake-toggle"
          aria-pressed={desarmado}
          onClick={() => setDesarmado(!desarmado)}
        >
          {desarmado ? 'Armar el pastel ↙' : 'Desarmar el pastel ↗'}
        </button>
      )}
    </div>
  );
}
