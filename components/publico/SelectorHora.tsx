'use client';

interface SelectorHoraProps {
  id?: string;
  nombre?: string;
  label?: string;
  valor: string;
  onChange: (hora: string) => void;
  requerido?: boolean;
  error?: string;
}

const OPCIONES_HORA = [
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
];

export default function SelectorHora({
  id = 'hora',
  nombre = 'hora',
  label,
  valor,
  onChange,
  requerido = true,
  error,
}: SelectorHoraProps) {
  return (
    <div className="field-group">
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {requerido && <span className="requerido">*</span>}
        </label>
      )}
      <select
        id={id}
        name={nombre}
        value={valor}
        required={requerido}
        onChange={(e) => onChange(e.target.value)}
        className={`field-input field-select ${error ? 'field-error' : ''}`}
      >
        <option value="">Selecciona hora de llegada (15:00 a 21:30)</option>
        {OPCIONES_HORA.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {error && <span className="field-error-mensaje">{error}</span>}
    </div>
  );
}
