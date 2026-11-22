import React from 'react';
import Icon, { IconName } from './Icon';

interface Props {
  title: string;
  hint?: string;
  icon?: IconName;
  /** Botón de acción opcional (ej. "Agregar la primera pieza"). */
  action?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<Props> = ({ title, hint, icon = 'inbox', action }) => (
  <div className="empty-state">
    <Icon name={icon} size={40} />
    <span className="empty-state-title">{title}</span>
    {hint && <span className="empty-state-hint">{hint}</span>}
    {action && (
      <button className="btn-primary" style={{ marginTop: 6 }} onClick={action.onClick}>
        <Icon name="plus" size={15} /> {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
