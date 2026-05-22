import React from 'react';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import {
  formatAttendanceDate,
  formatAttendanceTime,
  getAttendanceMethodLabel,
  getRejectReasonLabel,
} from './attendanceFormatters';
import './AttendanceTable.css';

const AttendanceTable = ({ attendances = [], emptyMessage = 'No hay asistencias para mostrar.' }) => {
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
            <th>Plan</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {attendances.map(attendance => (
            <tr key={attendance.id}>
              <td data-label="Alumno">{attendance.student?.name || '-'}</td>
              <td data-label="DNI">{attendance.student?.dni || '-'}</td>
              <td data-label="Plan">{attendance.plan?.name || '-'}</td>
              <td data-label="Fecha">{formatAttendanceDate(attendance.date)}</td>
              <td data-label="Hora">{formatAttendanceTime(attendance.date)}</td>
              <td data-label="Método">{getAttendanceMethodLabel(attendance.method)}</td>
              <td data-label="Estado"><AttendanceStatusBadge status={attendance.status} /></td>
              <td data-label="Motivo">{getRejectReasonLabel(attendance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
