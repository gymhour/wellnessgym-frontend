import React, { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import './TurnosDisponibilidad.css';

const TurnosDisponibilidad = ({ disponibilidad }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  useEffect(() => {
    if (disponibilidad?.disponibles !== 0) setShowTooltip(false);
  }, [disponibilidad?.disponibles]);
  if (!disponibilidad) return null;
  const empty = disponibilidad.disponibles === 0;

  return (
    <div className="turnos-disponibilidad" aria-live="polite">
      <div className="turnos-disponibilidad__linea">
        <p className={`turnos-disponibilidad__contador ${empty ? 'sin-disponibilidad' : 'con-disponibilidad'}`}>
          <strong>{disponibilidad.disponibles}/{disponibilidad.total}</strong>{' '}turnos disponibles en tu plan
        </p>
        {empty && (
          <span className="turnos-disponibilidad__tooltip-wrapper">
            <button type="button" className="turnos-disponibilidad__tooltip-trigger"
              aria-label="Más información sobre la disponibilidad de turnos" aria-expanded={showTooltip}
              aria-describedby={showTooltip ? 'disponibilidad-turnos-tooltip' : undefined}
              onClick={() => setShowTooltip((visible) => !visible)}
              onKeyDown={(event) => { if (event.key === 'Escape') setShowTooltip(false); }}>
              <CircleHelp size={17} aria-hidden="true" />
            </button>
            {showTooltip && <span id="disponibilidad-turnos-tooltip" className="turnos-disponibilidad__tooltip" role="tooltip">
              Cancelá un turno próximo para liberar un lugar y poder reservar otro.
            </span>}
          </span>
        )}
      </div>
    </div>
  );
};

export default TurnosDisponibilidad;
