import React from 'react';

export type IconName =
  | 'edit' | 'trash' | 'print' | 'play' | 'check' | 'x'
  | 'clip' | 'file' | 'download' | 'plus' | 'sun' | 'moon'
  | 'search' | 'inbox' | 'alert' | 'arrow-right'
  | 'chevron-left' | 'chevron-right';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

/** Íconos de interfaz (acciones). Mismo estilo de línea que ModuleIcon. */
const Icon: React.FC<Props> = ({ name, size = 18, className }) => {
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
    'aria-hidden': true,
  };

  switch (name) {
    case 'edit':
      return <svg {...common}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></svg>;
    case 'print':
      return <svg {...common}><path d="M7 9V3h10v6" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>;
    case 'play':
      return <svg {...common}><path d="M7 4.5v15l12-7.5-12-7.5Z" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
    case 'x':
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'clip':
      return <svg {...common}><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" /></svg>;
    case 'file':
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h6" /></svg>;
    case 'download':
      return <svg {...common}><path d="M12 4v11" /><path d="m7.5 11 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'sun':
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></svg>;
    case 'moon':
      return <svg {...common}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
    case 'inbox':
      return <svg {...common}><path d="M4 13 6.5 5h11L20 13" /><path d="M4 13v6h16v-6h-5l-1.5 2.5h-3L9 13H4Z" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>;
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case 'chevron-left':
      return <svg {...common}><path d="m14.5 6-6 6 6 6" /></svg>;
    case 'chevron-right':
      return <svg {...common}><path d="m9.5 6 6 6-6 6" /></svg>;
    default:
      return null;
  }
};

export default Icon;
