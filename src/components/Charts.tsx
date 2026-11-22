import React from 'react';

/* ═══════════════ Dona ═══════════════ */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{ data: DonutSlice[]; size?: number; centerLabel?: string }> = ({
  data,
  size = 170,
  centerLabel = 'Total',
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="chart-donut">
      <div className="chart-donut-svg" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={stroke} />
          {total > 0 &&
            data.map(d => {
              if (d.value === 0) return null;
              const len = (d.value / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="chart-donut-center">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="chart-legend">
        {data.map(d => (
          <li key={d.label}>
            <i style={{ background: d.color }} />
            <span>{d.label}</span>
            <b>{d.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ═══════════════ Barras ═══════════════ */
export interface BarDatum {
  label: string;
  value: number;
}

export const BarChart: React.FC<{ data: BarDatum[]; height?: number; color?: string }> = ({
  data,
  height = 170,
  color = 'var(--primary)',
}) => {
  const max = Math.max(1, ...data.map(d => d.value));

  return (
    <div className="chart-bars" style={{ height }}>
      {data.map(d => (
        <div className="chart-bar-col" key={d.label}>
          <span className="chart-bar-value">{d.value}</span>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{ height: `${(d.value / max) * 100}%`, background: color }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="chart-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
};
