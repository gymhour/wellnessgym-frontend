import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { Edit, Trash2, Users } from 'lucide-react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import ConfirmationPopup from '../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import apiService, { fetchAllClientsActive } from '../../../services/apiService';
import './GruposUsuarios.css';

const customStyles = {
  control: (provided) => ({
    ...provided,
    backgroundColor: 'var(--background-color-distinct)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-color)',
    minHeight: 44
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--background-color)',
    color: 'var(--text-color)',
    zIndex: 20
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--primary-color)' : 'var(--background-color)',
    color: 'var(--text-color)'
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'var(--primary-color)'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#fff'
  })
};

const emptyForm = {
  ID_GrupoUsuario: null,
  nombre: '',
  descripcion: '',
  estado: true,
  miembros: []
};

const GruposUsuarios = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);

  const usuarioOptions = useMemo(() => usuarios.map(u => ({
    label: `${u.nombre || ''} ${u.apellido || ''} (${u.email})`,
    value: u.ID_Usuario
  })), [usuarios]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gruposResp, clientes] = await Promise.all([
        apiService.getGruposUsuarios(),
        fetchAllClientsActive(apiService, { take: 100 })
      ]);
      setGrupos(Array.isArray(gruposResp?.grupos) ? gruposResp.grupos : []);
      setUsuarios(clientes);
    } catch (error) {
      toast.error('No se pudieron cargar los grupos de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => setForm(emptyForm);

  const editGrupo = (grupo) => {
    setForm({
      ID_GrupoUsuario: grupo.ID_GrupoUsuario,
      nombre: grupo.nombre || '',
      descripcion: grupo.descripcion || '',
      estado: grupo.estado !== false,
      miembros: (grupo.miembros || []).map(m => {
        const usuario = m.usuario || m;
        return {
          label: `${usuario.nombre || ''} ${usuario.apellido || ''} (${usuario.email})`,
          value: usuario.ID_Usuario
        };
      }).filter(m => m.value)
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('Ingresá un nombre para el grupo');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      estado: form.estado,
      miembrosIds: form.miembros.map(m => Number(m.value)).filter(Boolean)
    };

    setSaving(true);
    try {
      if (form.ID_GrupoUsuario) {
        await apiService.updateGrupoUsuario(form.ID_GrupoUsuario, payload);
        toast.success('Grupo actualizado correctamente');
      } else {
        await apiService.createGrupoUsuario(payload);
        toast.success('Grupo creado correctamente');
      }
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await apiService.deleteGrupoUsuario(deleteId);
      toast.success('Grupo eliminado correctamente');
      setDeleteId(null);
      await loadData();
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el grupo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoaderFullScreen />;

  return (
    <div className="page-layout">
      <SidebarMenu isAdmin={true} isEntrenador={false} />
      <div className="content-layout grupos-usuarios-page">
        <div className="mi-rutina-title">
          <h2>Grupos de usuarios</h2>
        </div>

        <form className="grupo-form" onSubmit={handleSubmit}>
          <input
            value={form.nombre}
            onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Nombre del grupo"
          />
          <input
            value={form.descripcion}
            onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Descripción (opcional)"
          />
          <Select
            options={usuarioOptions}
            value={form.miembros}
            onChange={options => setForm(prev => ({ ...prev, miembros: options || [] }))}
            placeholder="Miembros del grupo"
            isMulti
            isSearchable
            styles={customStyles}
          />
          <label className="grupo-estado">
            <input
              type="checkbox"
              checked={form.estado}
              onChange={e => setForm(prev => ({ ...prev, estado: e.target.checked }))}
            />
            Activo
          </label>
          <div className="grupo-form-actions">
            <PrimaryButton linkTo="#" text={saving ? 'Guardando...' : form.ID_GrupoUsuario ? 'Actualizar grupo' : 'Crear grupo'} onClick={handleSubmit} />
            {form.ID_GrupoUsuario && <SecondaryButton linkTo="#" text="Cancelar" onClick={resetForm} />}
          </div>
        </form>

        <div className="grupos-list">
          {grupos.length === 0 ? (
            <p>No hay grupos creados.</p>
          ) : grupos.map(grupo => (
            <div className="grupo-card" key={grupo.ID_GrupoUsuario}>
              <div className="grupo-card-header">
                <div>
                  <h3>{grupo.nombre}</h3>
                  <p>{grupo.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="grupo-actions">
                  <button type="button" onClick={() => editGrupo(grupo)} title="Editar grupo"><Edit size={18} /></button>
                  <button type="button" onClick={() => setDeleteId(grupo.ID_GrupoUsuario)} title="Eliminar grupo"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="grupo-meta">
                <span className={grupo.estado ? 'grupo-status active' : 'grupo-status inactive'}>
                  {grupo.estado ? 'Activo' : 'Inactivo'}
                </span>
                <span><Users size={16} /> {grupo.miembros?.length || 0} miembros</span>
                <span>{grupo.rutinas?.length || 0} rutinas asignadas</span>
              </div>
              <div className="grupo-members">
                {(grupo.miembros || []).map(m => {
                  const usuario = m.usuario || m;
                  return (
                    <span key={usuario.ID_Usuario}>
                      {usuario.nombre} {usuario.apellido}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmationPopup
        isOpen={Boolean(deleteId)}
        message="¿Estás seguro que deseas eliminar este grupo?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default GruposUsuarios;
