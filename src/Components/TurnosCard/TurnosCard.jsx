import React from 'react';
import './turnosCard.css';
// import { ReactComponent as TurnoIcon } from '../../assets/icons/turno-icon.svg';
import { ReactComponent as TurnoCancelIcon } from '../../assets/icons/circle-x.svg';
import { CheckCircle2, CircleMinus, UserX, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { canCancelTurno, formatTurnoDate, isTurnoInFuture } from '../../utils/turnoDate';

const CANCELLATION_TIME_MESSAGE = "El turno solo puede cancelarse con al menos 1 hora de anticipación. Si necesitás resolverlo, hablá con el administrador.";

const PAST_STATUS = {
  ASISTIDO: { label: 'Turno asistido', shortLabel: 'Asistido', className: 'asistido', Icon: CheckCircle2 },
  CANCELADO: { label: 'Turno cancelado', shortLabel: 'Cancelado', className: 'cancelado', Icon: XCircle },
  AUSENTE: { label: 'Turno no asistido', shortLabel: 'No asistió', className: 'ausente', Icon: UserX },
};

const TurnosCard = ({ id, nombreTurno, fechaTurno, estado, onCancelTurno }) => {
  const formattedDate = formatTurnoDate(fechaTurno);
  const isFutureTurno = isTurnoInFuture(fechaTurno);
  const showCancelButton = canCancelTurno(fechaTurno);
  const pastStatus = PAST_STATUS[String(estado || '').toUpperCase()] || {
    label: 'Estado pendiente', shortLabel: 'Pendiente', className: 'pendiente', Icon: CircleMinus,
  };
  const PastStatusIcon = pastStatus.Icon;

  const handleUnavailableCancellation = () => {
    toast.info(CANCELLATION_TIME_MESSAGE);
  };

  return (
    <div className='turnos-card-ctn'>
      {/* <div className="turno-icon">
        <TurnoIcon className='icon' />
      </div> */}
      <div className="turno-name">
        <b>{nombreTurno ?? "Nombre no disponible"}</b>
      </div>
      <div className="turno-date">
        <p>{formattedDate}</p>
      </div>
      <div className="turno-cancel">
        {showCancelButton ? (
          <button 
            className="cancel-button" 
            onClick={() => onCancelTurno(id)}
            aria-label="Cancelar turno"
          >
            <TurnoCancelIcon className='icon' />
          </button>
        ) : isFutureTurno ? (
          <button
            className="cancel-button cancel-button-unavailable"
            onClick={handleUnavailableCancellation}
            aria-label="No se puede cancelar el turno con menos de 1 hora de anticipación"
            title="No se puede cancelar con menos de 1 hora de anticipación"
          >
            <TurnoCancelIcon className='icon' />
          </button>
        ) : (
          <span
            className={`turno-estado turno-estado--${pastStatus.className}`}
            aria-label={pastStatus.label}
            title={pastStatus.label}
          >
            <PastStatusIcon className='icon' aria-hidden="true" />
            <span>{pastStatus.shortLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default TurnosCard;
