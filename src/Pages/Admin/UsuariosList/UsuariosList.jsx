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
  const [filtros, setFiltros] = useState({ tipo: '', nombre: '', apellido: '', email: '', estado: '' });
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
    const empty = { tipo: '', nombre: '', apellido: '', email: '', estado: '' };
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
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                {fromAdmin && <col style={{ width: '22%' }} />}
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

                    <td data-label="Estado">{u.estado ? 'Activo' : 'Inactivo'}</td>

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