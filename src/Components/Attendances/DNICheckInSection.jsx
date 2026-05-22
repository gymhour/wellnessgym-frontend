import React, { useState } from 'react';
import CustomInput from '../utils/CustomInput/CustomInput';
import './CheckInSections.css';

const DNICheckInSection = ({ onCheckIn, loading }) => {
  const [dni, setDni] = useState('');

  const handleSubmit = event => {
    event.preventDefault();
    if (!dni.trim() || loading) return;
    onCheckIn(dni);
  };

  return (
    <form className="checkin-section" onSubmit={handleSubmit}>
      <div className="checkin-section-header">
        <h3>Ingreso por DNI</h3>
        <p>Ingresá el documento del alumno para validar su acceso.</p>
      </div>
      <div className="dni-checkin-row">
        <CustomInput
          value={dni}
          onChange={event => setDni(event.target.value.replace(/\D/g, ''))}
          placeholder="Ej: 11111111"
          inputMode="numeric"
          width="100%"
          className="dni-checkin-input"
        />
        <button type="submit" className="attendance-primary-action" disabled={loading || !dni.trim()}>
          {loading ? 'Verificando...' : 'Verificar ingreso'}
        </button>
      </div>
    </form>
  );
};

export default DNICheckInSection;
