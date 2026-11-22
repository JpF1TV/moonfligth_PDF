import React from 'react';

export type ModuleIconName =
  | 'inicio'
  | 'almacen'
  | 'historial'
  | 'mantenimiento'
  | 'operaciones'
  | 'ingenieria'
  | 'oma'
  | 'admin'
  | 'superadmin';

interface Props {
  name: ModuleIconName;
  size?: number;
  className?: string;
}

/**
 * Íconos SVG vectoriales representativos de cada módulo.
 * Trazo tipo "line icon" para un look limpio y profesional.
 */
const ModuleIcon: React.FC<Props> = ({ name, size = 22, className }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    // Casa / inicio
    case 'inicio':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9.5 20v-5h5v5" />
        </svg>
      );

    // Caja / almacén
    case 'almacen':
      return (
        <svg {...common}>
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
          <path d="M3 7.5 12 12l9-4.5" />
          <path d="M12 12v9" />
        </svg>
      );

    // Reloj / historial
    case 'historial':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );

    // Llave inglesa / mantenimiento
    case 'mantenimiento':
      return (
        <svg {...common}>
          <path d="M15.5 6.5a3.5 3.5 0 0 0-4.6 4.2L4 17.6 6.4 20l6.9-6.9a3.5 3.5 0 0 0 4.2-4.6l-2.1 2.1-2-.5-.5-2 2.6-1.6Z" />
        </svg>
      );

    // Avión / operaciones
    case 'operaciones':
      return (
        <svg {...common}>
          <path d="M21 16v-2l-8-5V4a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-3.5L21 16Z" />
        </svg>
      );

    // Engranaje con medidor / ingeniería
    case 'ingenieria':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </svg>
      );

    // Portapapeles / OMA (órdenes de trabajo)
    case 'oma':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3h6v1" />
          <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
        </svg>
      );

    // Escudo / panel admin
    case 'admin':
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6l-7-3Z" />
          <path d="m9.2 12 1.9 1.9L15 10" />
        </svg>
      );

    // Engranaje / super admin
    case 'superadmin':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z" />
        </svg>
      );

    default:
      return null;
  }
};

export default ModuleIcon;
