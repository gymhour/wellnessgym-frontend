import React, { useState } from 'react';
import { CheckCircle2, LogIn, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomInput from '../../../Components/utils/CustomInput/CustomInput';
import apiService from '../../../services/apiService';
import logo from '../../../assets/gymhour/logo_gymhour.png';
import './PublicCheckInPage.css';

const PublicCheckInPage = () => {
  const navigate = useNavigate();
  const [dni, setDni] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    if (!dni.trim() || loading) return;

    setLoading(true);
    try {
      const data = await apiService.registerAttendance({ dni, method: 'QR' });
      setResult(data);
      if (data.allowed) {
        setDni('');
      }
    } catch (error) {
      setResult({
        allowed: false,
        status: 'rejected',
        message: error.message || 'No se pudo registrar el ingreso.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setDni('');
  };

  const isAllowed = result?.allowed === true;

  return (
    <main className="public-checkin-page">
      <section className="public-checkin-shell">
        <div className="public-checkin-card">
          <img src={logo} alt="GymHour" className="public-checkin-logo" />
          <div className="public-checkin-heading">
            <ShieldCheck className="public-checkin-icon" />
            <div>
              <h1>Ingreso al gimnasio</h1>
              <p>Ingresá tu DNI para registrar la asistencia.</p>
            </div>
          </div>

          {!result ? (
            <form className="public-checkin-form" onSubmit={handleSubmit}>
              <CustomInput
                value={dni}
                onChange={event => setDni(event.target.value.replace(/\D/g, ''))}
                placeholder="DNI"
                inputMode="numeric"
                width="100%"
              />
              <button type="submit" className="attendance-primary-action public-checkin-submit" disabled={loading || !dni.trim()}>
                {loading ? 'Registrando...' : 'Registrar ingreso'}
              </button>
            </form>
          ) : (
            <section className={`public-checkin-result ${isAllowed ? 'success' : 'error'}`} aria-live="polite">
              <div className="public-checkin-result-icon-wrap">
                {isAllowed ? (
                  <CheckCircle2 className="public-checkin-result-icon" />
                ) : (
                  <XCircle className="public-checkin-result-icon" />
                )}
              </div>

              <div className="public-checkin-result-copy">
                <h2>{isAllowed ? 'Ingreso registrado' : 'No pudimos registrar tu ingreso'}</h2>
                <p>{result.message}</p>
                {!isAllowed && (
                  <p className="public-checkin-result-help">
                    Hablá con el administrador para solucionar este inconveniente.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="attendance-primary-action public-checkin-result-action"
                onClick={isAllowed ? () => navigate('/') : handleRetry}
              >
                {isAllowed ? <LogIn size={18} /> : <RotateCcw size={18} />}
                {isAllowed ? 'Ir a la App' : 'Intentarlo nuevamente'}
              </button>
            </section>
          )}
        </div>
      </section>
    </main>
  );
};

export default PublicCheckInPage;
