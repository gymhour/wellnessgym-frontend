import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import CustomDropdown from '../../../Components/utils/CustomDropdown/CustomDropdown';
import CustomInput from '../../../Components/utils/CustomInput/CustomInput';
import apiService from '../../../services/apiService';
import { toast } from 'react-toastify';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import { ArrowLeft } from 'lucide-react';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';

const EditarUsuario = () => {
  const { id } = useParams();

  const initialFormData = {
    email: '',
    dni: '',
    nombre: '',
    apellido: '',
    profesion: '',
    direc: '',
    tel: '',
    tipo: 'Cliente',
    fechaCumple: '',
    plan: '',
    estado: true,
    usaTurnosFijos: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [avatarFile, setAvatarFile] = useState(null);
  const [planOptions, setPlanOptions] = useState([]);
  const [clases, setClases] = useState([]);
  const [turnosFijos, setTurnosFijos] = useState([]);

  const tipos = ['Cliente', 'Entrenador', 'Admin'];
  const opcionesEstado = ['Si', 'No'];
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const data = await apiService.getPlanes();

        setPlanOptions(data.map(p => ({ label: p.nombre, value: p.ID_Plan })))
      } catch (error) {
        console.error('Error al cargar planes:', error);
        toast.error('No se pudieron cargar los planes disponibles');
      }
    };
    fetchPlanes();
    const fetchClases = async () => {
      try {
        const data = await apiService.getClases();
        setClases(data || []);
      } catch (error) {
        console.error('Error al cargar clases:', error);
      }
    };
    fetchClases();
  }, []);

  const horariosOptions = clases.flatMap(clase =>
    (clase.HorariosClase || [])
      .filter(h => h.activo !== false)
      .map(h => ({
        value: h.ID_HorarioClase,
        label: `${clase.nombre} · ${h.diaSemana} ${String(h.horaIni || '').slice(11, 16)}`
      }))
  );

  const addTurnoFijo = () => {
    const firstAvailable = horariosOptions.find(option => !turnosFijos.includes(option.value));
    if (!firstAvailable) return;
    setTurnosFijos(prev => [...prev, firstAvailable.value]);
  };

  const updateTurnoFijo = (index, value) => {
    const idHorario = Number(value);
    setTurnosFijos(prev => prev.map((item, idx) => idx === index ? idHorario : item));
  };

  const removeTurnoFijo = (index) => {
    setTurnosFijos(prev => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchUser = async () => {
      try {
        const user = await apiService.getUserById(id);

        const fechaISO = user?.fechaCumple
          ? new Date(user.fechaCumple).toISOString().slice(0, 10)
          : '';

        const tipoLower = (user?.tipo || '').toLowerCase();
        const tipoCapitalizado =
          tipoLower ? tipoLower.charAt(0).toUpperCase() + tipoLower.slice(1) : 'Cliente';

        // Nombre de plan si existe (API puede devolver { plan: { nombre, ID_Plan } } o solo ID)
        const planNombre =
          user?.plan?.nombre
          || user?.plan?.label
          || ''; // si no hay plan, queda vacío y no rompe

        setFormData({
          email: user?.email || '',
          dni: user?.dni || '',
          nombre: user?.nombre || '',
          apellido: user?.apellido || '',
          profesion: user?.profesion || '',
          direc: user?.direc || '',
          tel: user?.tel || '',
          tipo: tipoCapitalizado,
          fechaCumple: fechaISO,
          estado: !!user?.estado,
          usaTurnosFijos: !!user?.usaTurnosFijos,
          // Solo precargar plan para clientes; en admin/entrenador lo dejamos vacío
          plan: tipoLower === 'cliente' ? planNombre : ''
        });
        setTurnosFijos((user?.TurnosFijos || []).map(t => t.ID_HorarioClase).filter(Boolean));

      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar los datos del usuario');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTipoChange = (val) => {
    const tipo = typeof val === 'string' ? val : val.target.value;
    setFormData(f => ({ ...f, tipo }));
  };

  const handleEstadoChange = (val) => {
    const estado = typeof val === 'string'
      ? val === 'Si'
      : val.target.value === 'Si';
    setFormData(f => ({ ...f, estado }));
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const isoFecha = formData.fechaCumple
        ? new Date(formData.fechaCumple).toISOString()
        : '';

      const selectedPlan = planOptions.find(p => p.label === formData.plan);
      if (formData.tipo === 'Cliente' && !formData.dni.trim()) {
        toast.error('Ingresá el DNI del alumno');
        setIsLoading(false);
        return;
      }

      const payload = new FormData();
      payload.append('email', formData.email);
      payload.append('dni', formData.dni);
      payload.append('nombre', formData.nombre);
      payload.append('apellido', formData.apellido);
      payload.append('direc', formData.direc);
      payload.append('tel', formData.tel);
      payload.append('tipo', formData.tipo.toLowerCase());
      payload.append('fechaCumple', isoFecha);

      if (formData.tipo === 'Cliente' && selectedPlan) {
        payload.append('ID_Plan', selectedPlan.value);
      }

      payload.append('usaTurnosFijos', String(formData.usaTurnosFijos));
      if (formData.tipo === 'Cliente') {
        const uniqueTurnos = Array.from(new Set(turnosFijos.map(Number).filter(Boolean)));
        if (formData.usaTurnosFijos && uniqueTurnos.length === 0) {
          toast.error('Seleccioná al menos un turno fijo');
          setIsLoading(false);
          return;
        }
        payload.append('turnosFijos', JSON.stringify(formData.usaTurnosFijos ? uniqueTurnos : []));
      }

      if (formData.tipo === 'Entrenador' && formData.profesion) {
        payload.append('profesion', formData.profesion);
      }

      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      await apiService.updateUserById(id, payload);
      setIsLoading(false)
      toast.success('Usuario actualizado correctamente');
      navigate("/admin/usuarios");
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al actualizar usuario';
      setIsLoading(false)
      toast.error(msg);
    }
  };

  return (
    <>
      {/* Estilos para dos columnas en escritorio y una columna en mobile */}
      <style>{`
        .form-two {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
          max-width: 640px;
          padding-top: 30px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: calc(50% - 8px);
        }
        .form-field.full-width {
          width: 100%;
        }
        @media (max-width: 768px) {
          .form-field {
            width: 100%;
          }
        }
        .button-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }
      `}</style>

      <div className="page-layout">
        {isLoading && <LoaderFullScreen />}
        <SidebarMenu isAdmin={true} />
        <div className="content-layout">
          <SecondaryButton
            text="Volver atrás"
            linkTo="/admin/usuarios"
            icon={ArrowLeft}
            reversed={true}
          />
          <h2>Editar usuario</h2>
          <form
            onSubmit={handleSubmit}
            className="form-two"
          >
            <div className="form-field">
              <label htmlFor="email">Email:</label>
              <CustomInput
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Ingresa tu email"
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="nombre">Nombre:</label>
              <CustomInput
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ingresa el nombre"
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="dni">DNI:</label>
              <CustomInput
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder="Ingresa el DNI"
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="apellido">Apellido:</label>
              <CustomInput
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Ingresa el apellido"
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="tipo">Tipo de usuario:</label>
              <CustomDropdown
                options={tipos}
                value={formData.tipo}
                onChange={handleTipoChange}
                name="tipo"
                id="tipo"
              />
            </div>

            {formData.tipo === 'Cliente' && (
              <div className="form-field">
                <label htmlFor="plan">Plan:</label>
                <CustomDropdown
                  options={planOptions.map(p => p.label)}
                  value={formData.plan}
                  onChange={e =>
                    setFormData(f => ({
                      ...f,
                      plan: e.target.value
                    }))
                  }
                  name="plan"
                  id="plan"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    name="usaTurnosFijos"
                    checked={formData.usaTurnosFijos}
                    onChange={handleChange}
                  />
                  Usa turnos fijos
                </label>

                {formData.usaTurnosFijos && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {turnosFijos.map((turnoId, index) => (
                      <div key={`${turnoId}-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={turnoId}
                          onChange={(e) => updateTurnoFijo(index, e.target.value)}
                          style={{ flex: 1 }}
                        >
                          {horariosOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeTurnoFijo(index)}>Quitar</button>
                      </div>
                    ))}
                    <button type="button" onClick={addTurnoFijo} disabled={horariosOptions.length === 0}>
                      Agregar turno fijo
                    </button>
                  </div>
                )}
              </div>
            )}

            {formData.tipo === 'Entrenador' && (
              <div className="form-field">
                <label htmlFor="profesion">Profesión:</label>
                <CustomInput
                  type="text"
                  id="profesion"
                  name="profesion"
                  value={formData.profesion}
                  onChange={handleChange}
                  placeholder="Ingresa la profesión"
                  width="100%"
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="direc">Dirección:</label>
              <CustomInput
                type="text"
                id="direc"
                name="direc"
                value={formData.direc}
                onChange={handleChange}
                placeholder="Ingresa la dirección"
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="tel">Teléfono:</label>
              <CustomInput
                type="tel"
                id="tel"
                name="tel"
                value={formData.tel}
                onChange={handleChange}
                placeholder="Ingresa el teléfono"
                width="100%"
              />
            </div>

            {/* <div className="form-field">
              <label htmlFor="estado">Activo:</label>
              <CustomDropdown
                options={opcionesEstado}
                value={formData.estado ? 'Si' : 'No'}
                onChange={handleEstadoChange}
                name="estado"
                id="estado"
              />
            </div> */}

            <div className="form-field">
              <label htmlFor="fechaCumple">Fecha de Nacimiento:</label>
              <CustomInput
                type="date"
                id="fechaCumple"
                name="fechaCumple"
                value={formData.fechaCumple}
                onChange={handleChange}
                width="100%"
              />
            </div>

            <div className="form-field">
              <label htmlFor="avatar">Avatar:</label>
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="form-field full-width button-container">
              <PrimaryButton text="Actualizar usuario" type="submit" onClick={handleSubmit} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditarUsuario;
