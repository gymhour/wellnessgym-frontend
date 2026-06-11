import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../App.css';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import apiClient from '../../../axiosConfig';
import apiService from '../../../services/apiService';
import './usuariosList.css';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import ConfirmationPopup from '../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import { toast } from "react-toastify";
import CustomDropdown from '../../../Components/utils/CustomDropdown/CustomDropdown';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, UserPlus, Upload, ExternalLink, SlidersHorizontal } from 'lucide-react';
import CustomInput from '../../../Components/utils/CustomInput/CustomInput';
import ImportUsuariosModal from './ImportUsuariosModal';

// Motivos de baja (debe coincidir con la whitelist del backend en user.Controller.ts)
const MOTIVOS_BAJA = [
  'Falta de pago / cobranza',
  'Motivos económicos',
  'Falta de tiempo',
  'Mudanza',
  'Lesión o problema de salud',
  'Insatisfacción (servicio/instalaciones)',
  'Se cambió a otro gimnasio',
  'Objetivo cumplido',
  'Desmotivación',
  'Otros / Sin motivo',
];

// Motivos de alta / reactivación (debe coincidir con MOTIVOS_ALTA del backend)
const MOTIVOS_ALTA = [
  'Buenas instalaciones',
  'Precio competitivo / promoción',
  'Buena atención',
  'Cercanía / ubicación',
  'Recomendación de un conocido',
  'Redes sociales / publicidad',
  'Variedad de clases y horarios',
  'Calidad de los entrenadores',
  'Recomendación médica / salud',
  'Otro / Sin motivo',
];

const normalizeFilterValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeTextFilters = (filters) => ({
  ...filters,
  nombre: normalizeFilterValue(filters.nombre),
  apellido: normalizeFilterValue(filters.apellido),
  email: normalizeFilterValue(filters.email),
  dni: normalizeFilterValue(filters.dni),
});

const UsuariosList = ({ fromAdmin, fromEntrenador }) => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Historial de turnos modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [turnosHistory, setTurnosHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histFiltroEstado, setHistFiltroEstado] = useState('');
  const [histFechaDesde, setHistFechaDesde] = useState('');
  const [histFechaHasta, setHistFechaHasta] = useState('');
  const [historyActiveTab, setHistoryActiveTab] = useState('past');
  const [showCancelPendingPopup, setShowCancelPendingPopup] = useState(false);
  const [cancelPendingLoading, setCancelPendingLoading] = useState(false);
  const [showRegenerateFixedPopup, setShowRegenerateFixedPopup] = useState(false);
  const [regenerateFixedLoading, setRegenerateFixedLoading] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthUser, setHealthUser] = useState(null);
  const [healthForm, setHealthForm] = useState({ observacionesSalud: '', fichaMedicaUrl: '' });
  const [healthLoading, setHealthLoading] = useState(false);

  // ➜ agregamos estado en filtros
  const [filtros, setFiltros] = useState({ tipo: '', nombre: '', apellido: '', email: '', estado: '', dni: '', plan: '' });
  const [draftFiltros, setDraftFiltros] = useState(filtros);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const defaultAvatar = "https://..."; // tu URL
  const opcionesTipo = fromAdmin ? ['Cliente', 'Entrenador', 'Admin'] : ['Cliente'];
  const opcionesEstado = ['Activo', 'Inactivo'];
  const [planesList, setPlanesList] = useState([]);

  const [showFilters, setShowFilters] = useState(false);

  const estadoToBool = (s) => {
    if (s === 'Activo') return true;
    if (s === 'Inactivo') return false;
    return undefined;
  };

  const fetchUsuarios = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const activeFilters = normalizeTextFilters(filtros);
      if (activeFilters.tipo) params.tipo = activeFilters.tipo.toLowerCase(); // normalizo
      if (activeFilters.nombre) params.nombre = activeFilters.nombre;
      if (activeFilters.apellido) params.apellido = activeFilters.apellido;
      if (activeFilters.email) params.email = activeFilters.email;
      if (activeFilters.dni) params.dni = activeFilters.dni;
      if (activeFilters.plan) params.planId = activeFilters.plan;

      // ➜ enviar estado=true/false si corresponde
      if (activeFilters.estado) {
        const est = estadoToBool(activeFilters.estado);
        if (typeof est === 'boolean') params.estado = est;
      }

      params.page = page;

      const { data } = await apiClient.get('/usuarios', { params });
      const lista = data.data || [];
      const listaUsuariosClientes = lista.filter(u => u.tipo === "cliente");

      setUsuarios(fromAdmin ? lista : listaUsuariosClientes);
      setHasMore(lista.length > 0);
    } catch (err) {
      console.error('Error al obtener los usuarios:', err);
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [filtros, page, fromAdmin]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  useEffect(() => {
    apiService.getPlanes().then(res => {
      if (Array.isArray(res)) setPlanesList(res);
    }).catch(() => {});
  }, []);

  const handleChangeDraft = (e) =>
    setDraftFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltros(normalizeTextFilters(draftFiltros));
  };

  const limpiarFiltros = () => {
    const empty = { tipo: '', nombre: '', apellido: '', email: '', estado: '', dni: '', plan: '' };
    setDraftFiltros(empty);
    setFiltros(empty);
    setPage(1);
  };

  const updateUsuarioEstado = async (id, nuevoEstado, motivo) => {
    setLoading(true);
    try {
      const body = { estado: nuevoEstado };
      if (!nuevoEstado && motivo) body.motivoBaja = motivo;
      if (nuevoEstado && motivo) body.motivoReactivacion = motivo;
      await apiClient.put(`/usuarios/estado/${id}`, body);
      setUsuarios(prev =>
        prev.map(u =>
          u.ID_Usuario === id ? { ...u, estado: nuevoEstado } : u
        )
      );
      toast.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const openEstadoPopup = user => {
    setSelectedUser(user);
    setMotivoSeleccionado('');
    setIsPopupOpen(true);
  };
  const closePopup = () => {
    setIsPopupOpen(false);
    setSelectedUser(null);
    setMotivoSeleccionado('');
  };
  const confirmEstadoChange = () => {
    if (!selectedUser) return;
    // Acción única según el estado actual: activo → baja; inactivo → reactivación.
    updateUsuarioEstado(selectedUser.ID_Usuario, !selectedUser.estado, motivoSeleccionado);
    closePopup();
  };

  const handlePopupConfirm = (nuevoEstado) => {
    if (!selectedUser) return;
    updateUsuarioEstado(selectedUser.ID_Usuario, nuevoEstado, motivoSeleccionado);
    closePopup();
  };

  const fetchTurnosHistory = async (user) => {
    setHistoryUser(user);
    setHistFiltroEstado('');
    setHistFechaDesde('');
    setHistFechaHasta('');
    setHistoryActiveTab('past');
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const data = await apiService.getTurnosUsuario(user.ID_Usuario);
      setTurnosHistory(data || []);
    } catch {
      toast.error('Error al cargar historial de turnos');
      setTurnosHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };
  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryUser(null);
    setTurnosHistory([]);
  };

  const parseLocalISO = useCallback((isoString) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }, []);

  const getTurnoDateTime = useCallback((turno) => {
    const fecha = new Date(turno.fecha);
    if (Number.isNaN(fecha.getTime())) return new Date(0);

    const horaIni = turno.HorarioClase?.horaIni ? parseLocalISO(turno.HorarioClase.horaIni) : null;
    if (horaIni) {
      fecha.setHours(horaIni.getHours(), horaIni.getMinutes(), horaIni.getSeconds(), 0);
    }

    return fecha;
  }, [parseLocalISO]);

  const isPendingTurno = useCallback((turno, now = new Date()) =>
    getTurnoDateTime(turno) > now && turno.estado !== 'CANCELADO',
    [getTurnoDateTime]
  );

  const isPastTurno = useCallback((turno, now = new Date()) =>
    getTurnoDateTime(turno) <= now,
    [getTurnoDateTime]
  );

  const historyTabCounts = useMemo(() => {
    const now = new Date();
    return {
      past: turnosHistory.filter(t => isPastTurno(t, now)).length,
      pending: turnosHistory.filter(t => isPendingTurno(t, now)).length,
    };
  }, [turnosHistory, isPastTurno, isPendingTurno]);

  const pendingTurnos = useMemo(() => {
    const now = new Date();
    return turnosHistory.filter(t => isPendingTurno(t, now));
  }, [turnosHistory, isPendingTurno]);

  const handleCancelPendingTurnos = async () => {
    if (cancelPendingLoading) return;

    if (pendingTurnos.length === 0) {
      setShowCancelPendingPopup(false);
      return;
    }

    setCancelPendingLoading(true);
    try {
      const results = await Promise.allSettled(
        pendingTurnos.map(t => apiService.deleteTurno(t.id_turno))
      );
      const successfulIds = pendingTurnos
        .filter((_, index) => results[index].status === 'fulfilled')
        .map(t => t.id_turno);
      const failedCount = results.length - successfulIds.length;

      if (successfulIds.length > 0) {
        setTurnosHistory(prev =>
          prev.map(t =>
            successfulIds.includes(t.id_turno) ? { ...t, estado: 'CANCELADO' } : t
          )
        );
      }

      if (failedCount > 0) {
        toast.error(`Se cancelaron ${successfulIds.length} turno(s), pero ${failedCount} no se pudieron cancelar.`);
      } else {
        toast.success('Todos los turnos pendientes fueron cancelados.');
      }
    } catch {
      toast.error('Error al cancelar los turnos pendientes.');
    } finally {
      setCancelPendingLoading(false);
      setShowCancelPendingPopup(false);
    }
  };

  const handleRegenerateFixedTurnos = async () => {
    if (regenerateFixedLoading) return;

    if (!historyUser?.ID_Usuario) {
      setShowRegenerateFixedPopup(false);
      return;
    }

    setRegenerateFixedLoading(true);
    try {
      const result = await apiService.regenerateTurnosFijosUsuario(historyUser.ID_Usuario);
      const data = await apiService.getTurnosUsuario(historyUser.ID_Usuario);
      setTurnosHistory(data || []);
      setHistoryActiveTab('pending');

      if (result?.advertencias?.detalles?.length > 0) {
        toast.warning(result.advertencias.mensaje || result.message || 'Se regeneraron algunos turnos fijos con advertencias.');
      } else {
        toast.success(result?.message || 'Turnos fijos regenerados correctamente.');
      }
    } catch (error) {
      toast.error(error?.message || 'Error al regenerar turnos fijos.');
    } finally {
      setRegenerateFixedLoading(false);
      setShowRegenerateFixedPopup(false);
    }
  };

  const openHealthModal = (user) => {
    setHealthUser(user);
    setHealthForm({
      observacionesSalud: user?.observacionesSalud || '',
      fichaMedicaUrl: user?.fichaMedicaUrl || '',
    });
    setShowHealthModal(true);
  };

  const closeHealthModal = () => {
    if (healthLoading) return;
    setShowHealthModal(false);
    setHealthUser(null);
    setHealthForm({ observacionesSalud: '', fichaMedicaUrl: '' });
  };

  const handleHealthChange = (e) => {
    const { name, value } = e.target;
    setHealthForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveHealth = async (e) => {
    e.preventDefault();
    if (healthLoading || !healthUser?.ID_Usuario) return;

    setHealthLoading(true);
    try {
      const updated = await apiService.updateUserHealthById(healthUser.ID_Usuario, {
        observacionesSalud: healthForm.observacionesSalud,
        fichaMedicaUrl: healthForm.fichaMedicaUrl,
      });
      setUsuarios(prev =>
        prev.map(u =>
          u.ID_Usuario === healthUser.ID_Usuario
            ? {
              ...u,
              observacionesSalud: updated.observacionesSalud || '',
              fichaMedicaUrl: updated.fichaMedicaUrl || '',
            }
            : u
        )
      );
      toast.success('Datos de salud actualizados correctamente.');
      setShowHealthModal(false);
      setHealthUser(null);
      setHealthForm({ observacionesSalud: '', fichaMedicaUrl: '' });
    } catch (error) {
      toast.error(error?.message || 'No se pudieron actualizar los datos de salud.');
    } finally {
      setHealthLoading(false);
    }
  };

  // Turnos filtrados
  const filteredTurnos = useMemo(() => {
    const now = new Date();
    let list = turnosHistory.filter(t =>
      historyActiveTab === 'pending' ? isPendingTurno(t, now) : isPastTurno(t, now)
    );

    if (histFiltroEstado) {
      list = list.filter(t => t.estado === histFiltroEstado);
    }
    if (histFechaDesde) {
      const d = new Date(histFechaDesde);
      list = list.filter(t => getTurnoDateTime(t) >= d);
    }
    if (histFechaHasta) {
      const d = new Date(histFechaHasta);
      d.setHours(23, 59, 59, 999);
      list = list.filter(t => getTurnoDateTime(t) <= d);
    }

    return list.sort((a, b) => {
      const dateA = getTurnoDateTime(a).getTime();
      const dateB = getTurnoDateTime(b).getTime();
      return historyActiveTab === 'pending' ? dateA - dateB : dateB - dateA;
    });
  }, [turnosHistory, historyActiveTab, histFiltroEstado, histFechaDesde, histFechaHasta, isPastTurno, isPendingTurno, getTurnoDateTime]);

  // Resumen de asistencia
  const stats = useMemo(() => {
    const total = filteredTurnos.length;
    const asistidos = filteredTurnos.filter(t => t.estado === 'ASISTIDO').length;
    const ausentes = filteredTurnos.filter(t => t.estado === 'AUSENTE').length;
    const activos = filteredTurnos.filter(t => t.estado === 'ACTIVO').length;
    const cancelados = filteredTurnos.filter(t => t.estado === 'CANCELADO').length;
    const conEstado = asistidos + ausentes;
    const porcentaje = conEstado > 0 ? Math.round((asistidos / conEstado) * 100) : 0;
    return { total, asistidos, ausentes, activos, cancelados, porcentaje };
  }, [filteredTurnos]);

  // Agrupación por mes
  const groupedByMonth = useMemo(() => {
    const groups = {};
    for (const t of filteredTurnos) {
      const d = new Date(t.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    const sorted = Object.entries(groups).sort((a, b) =>
      historyActiveTab === 'pending' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
    );
    return sorted;
  }, [filteredTurnos, historyActiveTab]);

  const formatFecha = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatHora = (iso) => (iso || '').slice(11, 16);
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const getDiaSemana = (iso) => diasSemana[new Date(iso).getDay()];
  const getMesLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  };
  const badgeClass = (estado) => {
    const map = {
      ASISTIDO: 'turno-asistido',
      AUSENTE: 'turno-ausente',
      ACTIVO: 'turno-activo',
      CANCELADO: 'turno-cancelado',
    };
    return map[estado] || '';
  };
  const badgeLabel = (estado) => {
    const map = {
      ASISTIDO: 'Asistió',
      AUSENTE: 'Ausente',
      ACTIVO: 'Activo',
      CANCELADO: 'Cancelado',
    };
    return map[estado] || estado;
  };
  const badgeColor = (estado) => {
    const map = {
      ASISTIDO: '#10b981',
      AUSENTE: '#ef4444',
      ACTIVO: '#3b82f6',
      CANCELADO: '#6b7280',
    };
    return map[estado] || '#999';
  };

  const goPrevPage = () => page > 1 && setPage(p => p - 1);
  const goNextPage = () => hasMore && setPage(p => p + 1);

  return (
    <div className='page-layout'>
      {loading && <LoaderFullScreen />}
      <SidebarMenu isAdmin={fromAdmin} isEntrenador={fromEntrenador} />

      <div className='content-layout'>
        <div className="usuarios-page-header">
          <h2>Lista de usuarios</h2>
          <div className="usuarios-page-actions">
            <PrimaryButton
              text="Crear usuario"
              linkTo="/admin/crear-usuario"
              icon={UserPlus}
            />
            <SecondaryButton
              text="Importar usuarios"
              onClick={() => setShowImportModal(true)}
              icon={Upload}
            />
          </div>
        </div>

        <div className="usuarios-filters-toggle-row">
          <button
            className='toggle-filters-button'
            onClick={() => setShowFilters(prev => !prev)}
          >
            <SlidersHorizontal /> Filtros {showFilters ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {showFilters && (
          <form
            className="filtros-form"
            onSubmit={aplicarFiltros}
          >
            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="tipo">Tipo:</label>
              <CustomDropdown
                id="tipo"
                name="tipo"
                value={draftFiltros.tipo}            // ← FIX
                onChange={handleChangeDraft}
                options={opcionesTipo}
                placeholderOption="— Todos —"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="estado">Estado:</label>
              <CustomDropdown
                id="estado"
                name="estado"
                value={draftFiltros.estado}          // ← FIX
                onChange={handleChangeDraft}
                options={opcionesEstado}
                placeholderOption="— Todos —"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="nombre">Nombre:</label>
              <CustomInput
                type="text"
                id="nombre"
                name="nombre"
                value={draftFiltros.nombre}
                onChange={handleChangeDraft}
                placeholder="Ej: Juan"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="dni">DNI:</label>
              <CustomInput
                type="text"
                id="dni"
                name="dni"
                value={draftFiltros.dni}
                onChange={handleChangeDraft}
                placeholder="Ej: 38444555"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="apellido">Apellido:</label>
              <CustomInput
                type="text"
                id="apellido"
                name="apellido"
                value={draftFiltros.apellido}
                onChange={handleChangeDraft}
                placeholder="Ej: Gonzalez"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="email">Email:</label>
              <CustomInput
                type="text"
                id="email"
                name="email"
                value={draftFiltros.email}
                onChange={handleChangeDraft}
                placeholder="Ej: juan@gmail.com"
              />
            </div>

            <div className='usuarios-filtros-form-inputs-ctn'>
              <label htmlFor="plan">Plan:</label>
              <CustomDropdown
                id="plan"
                name="plan"
                value={draftFiltros.plan}
                onChange={handleChangeDraft}
                options={planesList.map(p => ({ value: String(p.ID_Plan), label: p.nombre }))}
                placeholderOption="— Todos —"
              />
            </div>

            <div className='usuarios-filtros-form-ctn'>
              <button type="submit" className="primary-button">
                Aplicar filtros
              </button>
              <button type="button" className="secondary-button" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </div>
          </form>
        )}

        {usuarios.length === 0 ? (
          <p>No hay usuarios para mostrar.</p>
        ) : (
          <div className="table-responsive">
            <table className='usuarios-table'>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Nombre y apellido</th>
                  <th>DNI</th>
                  <th>Tipo</th>
                  <th>Plan</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.ID_Usuario}>
                    <td data-label="Nombre y apellido">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.avatarUrl && (
                          <div
                            className="usuarios-table-userimage"
                            style={{
                              backgroundImage: `url(${u.avatarUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              flexShrink: 0
                            }}
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <div style={{ textTransform: 'capitalize' }}>{u.nombre} {u.apellido}</div>
                          <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td data-label="DNI">{u.dni || '—'}</td>

                    <td data-label="Tipo" style={{ textTransform: 'capitalize' }}>{u.tipo}</td>

                    <td data-label="Plan" style={{ textTransform: 'capitalize' }}>
                      {u.plan?.nombre || '—'}
                    </td>

                    <td data-label="Registro">{new Date(u.fechaRegistro).toLocaleDateString()}</td>

                    <td data-label="Estado">
                      <span className={`status-badge ${u.estado ? 'activo' : 'inactivo'}`}>
                        <span className="status-dot" />
                        {u.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                      <td data-label="Acciones" className="usuarios-table-actions">
                        <PrimaryButton
                          text="Editar"
                          linkTo={fromAdmin ? `/admin/editar-usuario/${u.ID_Usuario}` : `/entrenador/editar-usuario/${u.ID_Usuario}`}
                        />

                          <SecondaryButton
                            text="Salud"
                            onClick={() => openHealthModal(u)}
                          />
                        
                      </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="paginacion-controls">
          <button
            onClick={goPrevPage}
            disabled={page === 1}
            className="btn-page"
            aria-label="Página anterior"
            title="Página anterior"
          >
            <ChevronLeft />
          </button>
          <span>Página {page}</span>
          <button
            onClick={goNextPage}
            disabled={!hasMore}
            className="btn-page"
            aria-label="Página siguiente"
            title="Página siguiente"
          >
            <ChevronRight />
          </button>
        </div>

        {(fromAdmin || fromEntrenador) && (
          <ConfirmationPopup
            isOpen={isPopupOpen}
            onClose={closePopup}
            onConfirm={handlePopupConfirm}
            message="¿Qué acción deseas realizar?"
            options={["Activar", "Desactivar"]}
            placeholderOption="Elige estado"
          />
        )}

        {showHealthModal && (
          <div className="modal-overlay" onClick={closeHealthModal}>
            <div
              className="modal-content health-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="turnos-history-header">
                <div>
                  <h3 style={{ margin: 0 }}>Datos de salud</h3>
                  <span style={{ fontSize: '14px', color: 'var(--text-color-distinct)' }}>
                    {healthUser?.nombre} {healthUser?.apellido} · {healthUser?.email}
                  </span>
                </div>
                <button
                  className="turnos-history-close"
                  onClick={closeHealthModal}
                  aria-label="Cerrar datos de salud"
                  type="button"
                >
                  <X size={24} />
                </button>
              </div>

              <form className="health-modal-form" onSubmit={handleSaveHealth}>
                <label className="health-modal-field" htmlFor="healthFichaMedicaUrl">
                  <span className="health-modal-label-row">
                    Ficha médica
                    {healthForm.fichaMedicaUrl.trim() && (
                      <a
                        className="health-modal-external-link"
                        href={healthForm.fichaMedicaUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir ficha médica"
                        aria-label="Abrir ficha médica"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </span>
                  <input
                    id="healthFichaMedicaUrl"
                    name="fichaMedicaUrl"
                    type="text"
                    value={healthForm.fichaMedicaUrl}
                    onChange={handleHealthChange}
                    placeholder="URL de la ficha médica"
                  />
                </label>

                <label className="health-modal-field" htmlFor="healthObservacionesSalud">
                  <span>Observaciones de Salud</span>
                  <textarea
                    id="healthObservacionesSalud"
                    name="observacionesSalud"
                    value={healthForm.observacionesSalud}
                    onChange={handleHealthChange}
                    placeholder="Observaciones de salud"
                    rows={7}
                  />
                </label>

                <div className="health-modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeHealthModal}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={healthLoading}
                  >
                    {healthLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmationPopup
          isOpen={showCancelPendingPopup}
          onClose={() => {
            if (!cancelPendingLoading) setShowCancelPendingPopup(false);
          }}
          onConfirm={handleCancelPendingTurnos}
          message={`¿Seguro que querés cancelar todos los turnos pendientes de ${historyUser?.nombre || 'este usuario'}?`}
        >
          <p style={{ margin: '8px 0 0', color: 'var(--text-color-distinct)', fontSize: '14px' }}>
            Se cancelarán {pendingTurnos.length} turno(s).
          </p>
        </ConfirmationPopup>

        <ConfirmationPopup
          isOpen={showRegenerateFixedPopup}
          onClose={() => {
            if (!regenerateFixedLoading) setShowRegenerateFixedPopup(false);
          }}
          onConfirm={handleRegenerateFixedTurnos}
          message={`¿Regenerar los turnos fijos futuros de ${historyUser?.nombre || 'este usuario'}?`}
        >
          <p style={{ margin: '8px 0 0', color: 'var(--text-color-distinct)', fontSize: '14px' }}>
            Se usarán los turnos fijos actuales del perfil y la cuota vigente.
          </p>
        </ConfirmationPopup>
      </div>
    </div>
  );
};

export default UsuariosList;
