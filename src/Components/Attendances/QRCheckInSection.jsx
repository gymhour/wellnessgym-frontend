import React, { useMemo, useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './CheckInSections.css';

const QRCheckInSection = ({ publicPath = '/ingreso?source=qr' }) => {
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return publicPath;
    return new URL(publicPath, window.location.origin).toString();
  }, [publicPath]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="checkin-section">
      <div className="checkin-section-header">
        <h3>Ingreso por QR</h3>
        <p>Mostrá este QR en recepción para que el alumno ingrese su DNI desde el celular.</p>
      </div>
      <div className="qr-code-panel">
        <QRCodeSVG value={publicUrl} size={210} level="M" includeMargin />
      </div>
      <div className="qr-public-link">
        <QrCode className="qr-link-icon" />
        <span>{publicUrl}</span>
      </div>
      <div className="qr-checkin-controls single-action">
        <button
          type="button"
          className="attendance-primary-action"
          onClick={handleCopy}
        >
          <Copy size={18} />
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>
    </section>
  );
};

export default QRCheckInSection;
