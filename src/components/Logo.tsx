import React, { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo de KRONAIR: avión en ascenso con estela, sobre un cuadrado redondeado
 * con degradado azul → cian. Es vectorial, así que se ve nítido a cualquier tamaño.
 */
const Logo: React.FC<LogoProps> = ({ size = 50, className }) => {
  // Id único por instancia: varios logos en la misma página no se pisan el degradado
  const uid = useId().replace(/:/g, '');
  const bg = `kronair-bg-${uid}`;
  const shine = `kronair-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
      role="img"
      aria-label="KRONAIR"
    >
      <defs>
        <linearGradient id={bg} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id={shine} x1="32" y1="0" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base */}
      <rect width="64" height="64" rx="16" fill={`url(#${bg})`} />
      <rect width="64" height="64" rx="16" fill={`url(#${shine})`} />

      {/* Estela */}
      <path
        d="M10 54 L19 45"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.1 5.2"
      />
      <path d="M15 57 L24 48" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 5" />

      {/* Avión (apunta arriba a la derecha) */}
      <g transform="translate(33 31) rotate(45) scale(1.6) translate(-12 -12)">
        <path
          d="M21 16v-2l-8-5V4a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-3.5L21 16Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
};

export default Logo;
