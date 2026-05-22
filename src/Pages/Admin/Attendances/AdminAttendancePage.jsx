import React, { useEffect, useState } from 'react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import AttendanceFilters from '../../../Components/Attendances/AttendanceFilters';
import AttendanceTable from '../../../Components/Attendances/AttendanceTable';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import apiService from '../../../services/apiService';
import './AdminAttendancePage.css';

const emptyFilters = {
  fromDate: '',
  toDate: '',
  student: '',
  dni: '',
  status: '',
  method: '',
};

const AdminAttendancePage = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAttendances = async currentFilters => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAttendances(currentFilters);
      setAttendances(data);
    } catch (err) {
      setAttendances([]);
      setError(err.message || 'No se pudieron cargar las asistencias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendances(filters);
  }, [filters]);

  return (
    <div className="page-layout">
      <SidebarMenu isAdmin={true} />
      {loading && <LoaderFullScreen />}
      <main className="content-layout admin-attendance-page">
        <div className="attendance-page-header">
          <div>
            <h2>Asistencia de alumnos</h2>
            <p>Historial visual de ingresos permitidos y rechazados.</p>
          </div>
        </div>

        <AttendanceFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters)}
        />

        {error ? (
          <div className="attendance-error-state">
            <h3>Error de carga</h3>
            <p>{error}</p>
          </div>
        ) : (
          <AttendanceTable
            attendances={attendances}
            emptyMessage="No se encontraron asistencias con los filtros seleccionados."
          />
        )}
      </main>
    </div>
  );
};

export default AdminAttendancePage;
