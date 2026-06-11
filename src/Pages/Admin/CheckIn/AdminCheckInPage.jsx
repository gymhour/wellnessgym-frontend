import React, { useEffect, useState } from 'react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import DNICheckInSection from '../../../Components/Attendances/DNICheckInSection';
import QRCheckInSection from '../../../Components/Attendances/QRCheckInSection';
import CheckInResultCard from '../../../Components/Attendances/CheckInResultCard';
import apiService from '../../../services/apiService';
import './AdminCheckInPage.css';

const CHECKIN_TABS = {
  DNI: 'dni',
  QR: 'qr',
};

const AdminCheckInPage = () => {
  const [activeTab, setActiveTab] = useState(CHECKIN_TABS.DNI);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!result) return undefined;

    const timeoutId = setTimeout(() => {
      setResult(null);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [result]);

  const runCheckIn = async action => {
    setLoading(true);
    try {
      const data = await action();
      setResult(data);
    } catch (error) {
      setResult({
        allowed: false,
        status: 'rejected',
        message: error.message || 'No se pudo verificar el ingreso.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-layout">
      <SidebarMenu isAdmin={true} />
      <main className="content-layout admin-checkin-page">
        <div className="attendance-page-header">
          <div>
            <h2>Ingreso</h2>
            <p>Validación rápida para recepción por DNI o QR.</p>
          </div>
        </div>

        <div className="checkin-tabs" role="tablist" aria-label="Método de ingreso">
          <button
            type="button"
            className={activeTab === CHECKIN_TABS.DNI ? 'active' : ''}
            onClick={() => setActiveTab(CHECKIN_TABS.DNI)}
          >
            DNI
          </button>
          <button
            type="button"
            className={activeTab === CHECKIN_TABS.QR ? 'active' : ''}
            onClick={() => setActiveTab(CHECKIN_TABS.QR)}
          >
            QR
          </button>
        </div>

        <div className="checkin-layout">
          <div className="checkin-method-container">
            {activeTab === CHECKIN_TABS.DNI ? (
              <DNICheckInSection
                loading={loading}
                onCheckIn={dni => runCheckIn(() => apiService.registerAttendance({ dni, method: 'DNI' }))}
              />
            ) : (
              <QRCheckInSection
                publicPath="/ingreso?source=qr"
              />
            )}
          </div>
        </div>

        {result && (
          <div className="checkin-result-modal-overlay" role="status" aria-live="polite">
            <div className="checkin-result-modal">
              <h3 className="checkin-result-modal-title">
                {result.allowed ? 'Turno confirmado' : 'Turno negado'}
              </h3>
              <CheckInResultCard result={result} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCheckInPage;
