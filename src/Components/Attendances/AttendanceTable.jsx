import React, { useEffect, useRef, useState } from 'react';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import {
  formatAttendanceDate,
  formatAttendanceTime,
  getAttendanceMethodLabel,
  getRejectReasonLabel,
} from './attendanceFormatters';
import './AttendanceTable.css';

const ExpandableReason = ({ reason }) => {
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [reason]);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || expanded) return undefined;

    const updateTruncation = () => {
      setTruncated(textElement.scrollWidth > textElement.clientWidth + 1);
    };

    updateTruncation();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateTruncation)
      : null;
    resizeObserver?.observe(textElement);

    return () => resizeObserver?.disconnect();
  }, [reason, expanded]);

  return (
    <div className={`attendance-reason${expanded ? ' is-expanded' : ''}`}>
      <span ref={textRef} className="attendance-reason-text">{reason}</span>
      {(truncated || expanded) && (
        <button
          type="button"
          className="attendance-reason-toggle"
          onClick={() => setExpanded(current => !current)}
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
};

const AttendanceTable = ({
  attendances = [],
  emptyMessage = 'No hay asistencias para mostrar.',
  expandableReasons = false,
}) => {
  if (!attendances.length) {
    return (
      <div className="attendance-empty-state">
        <h3>Sin resultados</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="attendance-table-wrapper">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Alumno</th>
            <th>DNI</th>
            <th>Fecha y hora</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {attendances.map(attendance => {
            const reason = getRejectReasonLabel(attendance);
            const dateTime = `${formatAttendanceDate(attendance.date)} · ${formatAttendanceTime(attendance.date)}`;

            return (
              <tr key={attendance.id}>
                <td data-label="Alumno">{attendance.student?.name || '-'}</td>
                <td data-label="DNI">{attendance.student?.dni || '-'}</td>
                <td data-label="Fecha y hora">{dateTime}</td>
                <td data-label="Método">{getAttendanceMethodLabel(attendance.method)}</td>
                <td data-label="Estado"><AttendanceStatusBadge status={attendance.status} /></td>
                <td className="attendance-reason-cell" data-label="Motivo" title={expandableReasons ? undefined : reason}>
                  {expandableReasons ? <ExpandableReason reason={reason} /> : reason}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
