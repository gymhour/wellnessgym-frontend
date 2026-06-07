import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import apiClient from '../../../axiosConfig';
import { toast } from 'react-toastify';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

const COLUMNAS_ESPERADAS = ['email', 'dni', 'nombre', 'apellido', 'tel', 'direc', 'profesion', 'fechaCumple', 'plan'];

const ImportUsuariosModal = ({ onClose, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [usuarios, setUsuarios] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  const clearFile = () => {
    setUsuarios([]);
    setFileName('');
    setErrors(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    if (loading) return;
    if (usuarios.length === 0) {
      toast.error('No hay datos para importar. Verifique que el archivo tenga datos en las columnas correctas.');
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
    <div className="modal-overlay import-users-overlay" onClick={onClose}>
      <div
        className="modal-content import-users-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="import-users-header">
          <div>
            {/* <span className="import-users-eyebrow">Carga masiva</span> */}
            <h3>
              <Upload size={19} />
              Importar usuarios
            </h3>
          </div>
          <button className="import-users-close" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        <div className="import-users-info">
          <p>Seleccione un archivo .xlsx con estas columnas:</p>
          <code>{COLUMNAS_ESPERADAS.join(', ')}</code>
          <ul>
            <li>Email y DNI son obligatorios.</li>
            <li>La password inicial se crea con el DNI del usuario.</li>
            <li>El tipo de usuario se crea como Cliente.</li>
            <li>El plan debe coincidir con el nombre de un plan existente.</li>
            <li>La fecha de cumpleaños debe usar formato dd/mm/yyyy.</li>
          </ul>
        </div>

        <div className="import-users-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="import-users-file-input"
            hidden
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`import-users-file-button${fileName ? ' has-file' : ''}`}
          >
            <FileSpreadsheet size={22} />
            <span className="import-users-file-copy">
              <span>{fileName || 'Seleccionar archivo .xlsx'}</span>
              <small>{fileName ? `${usuarios.length} registros detectados` : 'Formato admitido: .xlsx o .xls'}</small>
            </span>
            {fileName && (
              <span
                className="import-users-clear-file"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                role="button"
                tabIndex={0}
                aria-label="Quitar archivo"
              >
                <X size={17} />
              </span>
            )}
          </button>
        </div>

        {usuarios.length > 0 && (
          <div className="import-users-preview">
            <div className="import-users-preview-title">
              <span>Vista previa</span>
              <small>{usuarios.length} registros encontrados</small>
            </div>
            <div className="import-users-table-wrap">
              <table className="import-users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Email</th>
                    <th>DNI</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.slice(0, 50).map((u, i) => (
                    <tr key={i}>
                      <td>{u._fila}</td>
                      <td className={!u.email ? 'is-empty' : ''}>{u.email || 'Vacio'}</td>
                      <td className={!u.dni ? 'is-empty' : ''}>{u.dni || 'Vacio'}</td>
                      <td>{u.nombre || '-'}</td>
                      <td>{u.apellido || '-'}</td>
                      <td>{u.plan || '-'}</td>
                    </tr>
                  ))}
                  {usuarios.length > 50 && (
                    <tr>
                      <td colSpan={6} className="import-users-more-row">
                        Y {usuarios.length - 50} registros mas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {errors && (
          <div className="import-users-errors">
            <div className="import-users-errors-title">
              <AlertCircle size={17} />
              <span>No se importó ningún usuario</span>
            </div>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>Fila {e.fila}: {e.campo} - {e.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="import-users-actions">
          <SecondaryButton text="Cancelar" onClick={onClose} />
          <button
            onClick={handleImport}
            className="primary-button import-users-submit"
            disabled={usuarios.length === 0 || loading}
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportUsuariosModal;
