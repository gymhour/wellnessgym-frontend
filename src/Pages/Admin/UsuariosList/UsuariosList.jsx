import React, { useEffect, useState } from 'react';
import '../../../App.css';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import apiClient from '../../../axiosConfig';
import './usuariosList.css';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import ConfirmationPopup from '../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import { toast } from "react-toastify";
import CustomDropdown from '../../../Components/utils/CustomDropdown/CustomDropdown';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomInput from '../../../Components/utils/CustomInput/CustomInput';

const UsuariosList = ({ fromAdmin, fromEntrenador }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // ➜ agregamos estado en filtros
  const [filtros, setFiltros] = useState({ tipo: '', nombre: '', apellido: '', email: '', estado: '', dni: '' });
  const [draftFiltros, setDraftFiltros] = useState(filtros);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const defaultAvatar = "https://..."; // tu URL
  const opcionesTipo = fromAdmin ? ['Cliente', 'Entrenador', 'Admin'] : ['Cliente'];
  const opcionesEstado = ['Activo', 'Inactivo'];

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
      if (filtros.tipo) params.tipo = filtros.tipo.toLowerCase(); // normalizo
      if (filtros.nombre) params.nombre = filtros.nombre;
      if (filtros.apellido) params.apellido = filtros.apellido;
      if (filtros.email) params.email = filtros.email;
      if (filtros.dni) params.dni = filtros.dni;

      // ➜ enviar estado=true/false si corresponde
      if (filtros.estado) {
        const est = estadoToBool(filtros.estado);
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

  const handleChangeDraft = (e) =>
    setDraftFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltros(draftFiltros);
  };

  const limpiarFiltros = () => {
    const empty = { tipo: '', nombre: '', apellido: '', email: '', estado: '', dni: '' };
    setDraftFiltros(empty);
    setFiltros(empty);
    setPage(1);
  };

  const updateUsuarioEstado = async (id, nuevoEstado) => {
    setLoading(true);
    try {
      await apiClient.put(`/usuarios/estado/${id}`, { estado: nuevoEstado });
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

  const openEstadoPopup = id => {
    setSelectedUserId(id);
    setIsPopupOpen(true);
  };
  const closePopup = () => {
    setIsPopupOpen(false);
    setSelectedUserId(null);
  };
  const handlePopupConfirm = estadoBool => {
    if (selectedUserId !== null) {
      updateUsuarioEstado(selectedUserId, estadoBool);
    }
    closePopup();
  };

  const goPrevPage = () => page > 1 && setPage(p => p - 1);
  const goNextPage = () => hasMore && setPage(p => p + 1);

  return (
    <div className='page-layout'>
      {loading && <LoaderFullScreen />}
      <SidebarMenu isAdmin={fromAdmin} isEntrenador={fromEntrenador} />

      <div className='content-layout'>
        <h2>Lista de usuarios</h2>

        <div style={{ margin: '30px 0px' }}>
          <button
            className='toggle-filters-button'
            onClick={() => setShowFilters(prev => !prev)}
          >
            Filtros {showFilters ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {showFilters && (
          <form
            className="filtros-form"
            style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}
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

            <div className='usuarios-filtros-form-ctn'>
              <PrimaryButton type="submit" text="Aplicar filtros" onClick={aplicarFiltros} />
              <SecondaryButton className="secondary-btn" onClick={limpiarFiltros} text="Limpiar filtros" />
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
                <col style={{ width: fromAdmin ? '14%' : '17%' }} />
                <col style={{ width: fromAdmin ? '9%' : '10%' }} />
                <col style={{ width: fromAdmin ? '18%' : '22%' }} />
                <col style={{ width: fromAdmin ? '8%' : '9%' }} />
                <col style={{ width: fromAdmin ? '8%' : '9%' }} />
                <col style={{ width: fromAdmin ? '9%' : '10%' }} />
                <col style={{ width: fromAdmin ? '9%' : '9%' }} />
                <col style={{ width: fromAdmin ? '8%' : '9%' }} />
                {fromAdmin && <col style={{ width: '12%' }} />}
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre y apellido</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Plan</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>WhatsApp</th>
                  {fromAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.ID_Usuario}>
                    <td data-label="ID">{u.ID_Usuario}</td>

                    <td data-label="Nombre y apellido" style={{ textTransform: 'capitalize' }}>
                      {u.nombre} {u.apellido}
                    </td>

                    <td data-label="DNI">{u.dni || '—'}</td>

                    <td data-label="Email" className="usuarios-table-email">
                      <div
                        className="usuarios-table-userimage"
                        style={{
                          backgroundImage: `url(${u.avatarUrl || defaultAvatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                        aria-hidden="true"
                      />
                      <span className="usuarios-table-email-text">{u.email}</span>
                    </td>

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

                    <td data-label="WhatsApp">
                      {u.tel ? (
                        <a
                          href={`https://wa.me/${u.tel.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-btn-table"
                          title={`Enviar WhatsApp a ${u.nombre}`}
                        >
                          <svg className="whatsapp-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.66 1.876 14.18 1.84 11.54 1.84c-5.436 0-9.86 4.42-9.864 9.864-.001 1.702.461 3.361 1.34 4.816l-.997 3.637 3.73-.978zm11.758-6.84c-.302-.15-1.782-.88-2.06-.98-.277-.1-.479-.15-.68.15-.2.3-.777.98-.952 1.18-.176.2-.351.225-.653.075-.302-.15-1.274-.47-2.427-1.498-.897-.8-1.502-1.79-1.678-2.09-.176-.3-.019-.462.132-.612.135-.135.302-.35.452-.525.15-.175.2-.299.3-.5.1-.2.05-.375-.025-.525-.075-.15-.68-1.64-.932-2.245-.246-.59-.497-.51-.68-.52-.176-.01-.377-.01-.578-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.03-1.053 2.51 0 1.48 1.079 2.91 1.23 3.11.151.2 2.124 3.244 5.145 4.545.718.31 1.278.495 1.714.634.722.23 1.38.197 1.902.12.58-.085 1.782-.73 2.033-1.433.251-.703.251-1.305.176-1.433-.075-.127-.276-.202-.578-.352z"/>
                          </svg>
                          <span>Chat</span>
                        </a>
                      ) : (
                        <span className="whatsapp-disabled" title="Sin número de teléfono">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.66 1.876 14.18 1.84 11.54 1.84c-5.436 0-9.86 4.42-9.864 9.864-.001 1.702.461 3.361 1.34 4.816l-.997 3.637 3.73-.978zm11.758-6.84c-.302-.15-1.782-.88-2.06-.98-.277-.1-.479-.15-.68.15-.2.3-.777.98-.952 1.18-.176.2-.351.225-.653.075-.302-.15-1.274-.47-2.427-1.498-.897-.8-1.502-1.79-1.678-2.09-.176-.3-.019-.462.132-.612.135-.135.302-.35.452-.525.15-.175.2-.299.3-.5.1-.2.05-.375-.025-.525-.075-.15-.68-1.64-.932-2.245-.246-.59-.497-.51-.68-.52-.176-.01-.377-.01-.578-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.03-1.053 2.51 0 1.48 1.079 2.91 1.23 3.11.151.2 2.124 3.244 5.145 4.545.718.31 1.278.495 1.714.634.722.23 1.38.197 1.902.12.58-.085 1.782-.73 2.033-1.433.251-.703.251-1.305.176-1.433-.075-.127-.276-.202-.578-.352z"/>
                          </svg>
                          <span>N/A</span>
                        </span>
                      )}
                    </td>

                    {fromAdmin && (
                      <td data-label="Acciones" className="usuarios-table-actions">
                        <PrimaryButton
                          text="Editar"
                          linkTo={`/admin/editar-usuario/${u.ID_Usuario}`}
                        />
                        {u.tipo !== 'admin' && (
                          <SecondaryButton
                            text="Cambiar estado"
                            onClick={() => openEstadoPopup(u.ID_Usuario)}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="paginacion-controls" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
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

        {fromAdmin && (
          <ConfirmationPopup
            isOpen={isPopupOpen}
            onClose={closePopup}
            onConfirm={handlePopupConfirm}
            message="¿Qué acción deseas realizar?"
            options={["Activar", "Desactivar"]}
            placeholderOption="Elige estado"
          />
        )}
      </div>
    </div>
  );
};

export default UsuariosList;