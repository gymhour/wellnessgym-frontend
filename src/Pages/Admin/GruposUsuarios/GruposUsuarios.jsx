import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { Edit, Trash2, Users } from 'lucide-react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import ConfirmationPopup from '../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import apiService from '../../../services/apiService';
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

const usuarioToOption = (usuario) => ({
  label: `${usuario.nombre || ''} ${usuario.apellido || ''}${usuario.dni ? ` - DNI ${usuario.dni}` : ''}`,
  value: usuario.ID_Usuario
});

const GruposUsuarios = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [usuarioOptions, setUsuarioOptions] = useState([]);
  const [usuarioSearch, setUsuarioSearch] = useState('');
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const gruposResp = await apiService.getGruposUsuarios();
      setGrupos(Array.isArray(gruposResp?.grupos) ? gruposResp.grupos : []);
    } catch (error) {
      toast.error('No se pudieron cargar los grupos de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const term = usuarioSearch.trim();
    let isCurrentRequest = true;

    if (term.length < 2) {
      setUsuarioOptions([]);
      setUsuariosLoading(false);
      return () => { isCurrentRequest = false; };
    }

    setUsuariosLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await apiService.getAllUsuarios({
          page: 1,
          take: 20,
          tipo: 'cliente',
          estado: true,
          search: term
        });

        if (!isCurrentRequest) return;
        const options = Array.isArray(response?.data)
          ? response.data.map(usuarioToOption)
          : [];
        setUsuarioOptions(options);
      } catch (error) {
        if (isCurrentRequest) {
          setUsuarioOptions([]);
          toast.error('No se pudieron buscar usuarios');
        }
      } finally {
        if (isCurrentRequest) setUsuariosLoading(false);
      }
    }, 300);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeoutId);
    };
  }, [usuarioSearch]);

  const mergedUsuarioOptions = useMemo(() => {
    const optionsById = new Map();
    [...form.miembros, ...usuarioOptions].forEach(option => {
      if (option?.value) optionsById.set(option.value, option);
    });
    return Array.from(optionsById.values());
  }, [form.miembros, usuarioOptions]);

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
          label: `${usuario.nombre || ''} ${usuario.apellido || ''}${usuario.dni ? ` - DNI ${usuario.dni}` : ''}`,
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
            options={mergedUsuarioOptions}
            value={form.miembros}
            onChange={options => setForm(prev => ({ ...prev, miembros: options || [] }))}
            onInputChange={(value, meta) => {
              if (meta.action === 'input-change') setUsuarioSearch(value);
            }}
            placeholder="Miembros del grupo"
            noOptionsMessage={() => usuarioSearch.trim().length < 2 ? 'Escribí al menos 2 caracteres' : 'No se encontraron usuarios'}
            loadingMessage={() => 'Buscando usuarios...'}
            isMulti
            isSearchable
            isLoading={usuariosLoading}
            filterOption={null}
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
