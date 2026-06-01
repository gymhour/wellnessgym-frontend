import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import apiClient from '../../../axiosConfig';
import { toast } from 'react-toastify';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import { X, Upload, FileSpreadsheet } from 'lucide-react';

const COLUMNAS_ESPERADAS = ['email', 'dni', 'nombre', 'apellido', 'tel', 'direc', 'profesion', 'fechaCumple', 'plan'];

const ImportUsuariosModal = ({ onClose, onSuccess }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrors(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const parsed = json.map((row, i) => ({
          _fila: i + 2,
          email: String(row.email || '').trim(),
          dni: String(row.dni || '').trim(),
          nombre: String(row.nombre || '').trim(),
          apellido: String(row.apellido || '').trim(),
          tel: String(row.tel || '').trim(),
          direc: String(row.direc || '').trim(),
          profesion: String(row.profesion || '').trim(),
          fechaCumple: String(row.fechaCumple || '').trim(),
          plan: String(row.plan || '').trim(),
        }));

        setUsuarios(parsed);
        setFileName(file.name);
      } catch {
        toast.error('Error al leer el archivo. Verifique que sea un .xlsx válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (usuarios.length === 0) {
      toast.error('No hay datos para importar');
      return;
    }

    setLoading(true);
    setErrors(null);
    try {
      const { data } = await apiClient.post('/usuarios/import', { usuarios });
      toast.success(`${data.count} usuario(s) importado(s) correctamente`);
      onSuccess();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        setErrors(errData.errors);
        toast.error('Error en algunos usuarios. Revise los detalles.');
      } else {
        toast.error(errData?.message || 'Error al importar usuarios');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} />
            Importar usuarios desde Excel
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-color-distinct)' }}>
          <p style={{ margin: '0 0 8px' }}>Seleccione un archivo <code>.xlsx</code> con las siguientes columnas:</p>
          <code style={{ fontSize: '13px', background: 'var(--background-color-distinct)', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
            email, dni, nombre, apellido, tel, direc, profesion, fechaCumple, plan
          </code>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            <li><strong>email</strong> y <strong>dni</strong> son obligatorios</li>
            <li><strong>password</strong> se asigna por defecto: <code>12345678</code></li>
            <li><strong>tipo</strong> se asigna por defecto: <code>Cliente</code></li>
            <li><strong>plan</strong> debe coincidir con el nombre de un plan existente (opcional)</li>
            <li><strong>fechaCumple</strong> formato: <code>dd/mm/yyyy</code></li>
          </ul>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 16px', border: '2px dashed var(--border-color)', borderRadius: '8px', background: 'var(--background-color-distinct)' }}>
            <FileSpreadsheet size={24} />
            <span>{fileName || 'Haga clic para seleccionar archivo .xlsx'}</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {usuarios.length > 0 && (
          <>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>
              {usuarios.length} registro(s) encontrado(s) — Vista previa:
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--background-color-distinct)', position: 'sticky', top: 0 }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>DNI</th>
                    <th style={thStyle}>Nombre</th>
                    <th style={thStyle}>Apellido</th>
                    <th style={thStyle}>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.slice(0, 50).map((u, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'var(--background-color)' : 'var(--background-color-distinct)' }}>
                      <td style={tdStyle}>{u._fila}</td>
                      <td style={{ ...tdStyle, color: u.email ? 'inherit' : 'var(--danger-color)' }}>{u.email || '(vacío)'}</td>
                      <td style={{ ...tdStyle, color: u.dni ? 'inherit' : 'var(--danger-color)' }}>{u.dni || '(vacío)'}</td>
                      <td style={tdStyle}>{u.nombre || '-'}</td>
                      <td style={tdStyle}>{u.apellido || '-'}</td>
                      <td style={tdStyle}>{u.plan || '-'}</td>
                    </tr>
                  ))}
                  {usuarios.length > 50 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '8px', color: 'var(--text-color-distinct)' }}>... y {usuarios.length - 50} más</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {errors && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
            <strong>Errores encontrados (no se importó ningún usuario):</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              {errors.map((e, i) => (
                <li key={i}>Fila {e.fila} — <strong>{e.campo}</strong>: {e.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <SecondaryButton text="Cancelar" onClick={onClose} />
          <button
            className="primary-button"
            onClick={handleImport}
            disabled={usuarios.length === 0 || loading}
            style={{ opacity: usuarios.length === 0 || loading ? 0.6 : 1, cursor: usuarios.length === 0 || loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border-color)',
  fontWeight: 600,
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--border-color)',
  whiteSpace: 'nowrap'
};

export default ImportUsuariosModal;
