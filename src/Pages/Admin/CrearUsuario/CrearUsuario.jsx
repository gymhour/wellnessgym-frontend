import React, { useState, useEffect } from 'react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import CustomDropdown from '../../../Components/utils/CustomDropdown/CustomDropdown';
import apiClient from '../../../axiosConfig';
import apiService from '../../../services/apiService';
import { toast } from 'react-toastify';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import { useNavigate } from 'react-router-dom';
import CustomInput from '../../../Components/utils/CustomInput/CustomInput';

const CrearUsuario = ({fromAdmin, fromEntrenador}) => {
  const initialFormData = {
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    profesion: '',
    direc: '',
    tel: '',
    tipo: '',
    fechaCumple: '',
    plan: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [planOptions, setPlanOptions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const data = await apiService.getPlanes();
        setPlanOptions(data.map(p => ({ label: p.nombre, value: p.ID_Plan })));
      } catch (error) {
        console.error('Error al cargar planes:', error);
        toast.error('No se pudieron cargar los planes disponibles');
      }
    };
    fetchPlanes();
  }, []);

  const handleChange = (eOrVal) => {
    const { name, value, type, checked } = eOrVal.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarFile(null);
      setAvatarPreview("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();            // ← evita el submit nativo
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Normalizo la fecha (si tu API espera "YYYY-MM-DD", enviá esa forma)
      const fechaPlano = formData.fechaCumple || '';
      const isoFecha = fechaPlano ? new Date(fechaPlano).toISOString() : '';

      // Valido plan si es Cliente
      let idPlan = null;
      if (formData.tipo === 'Cliente') {
        const selectedPlan = planOptions.find(p => p.label === formData.plan);
        if (!selectedPlan) {
          toast.error('Seleccioná un plan');
          setIsLoading(false);
          return;
        }
        idPlan = selectedPlan.value;
      }

      const payload = new FormData();
      payload.append('email', formData.email.trim());
      payload.append('password', formData.password);
      payload.append('nombre', formData.nombre.trim());
      payload.append('apellido', formData.apellido.trim());
      payload.append('direc', formData.direc.trim());
      payload.append('tel', formData.tel.trim());
      payload.append('tipo', formData.tipo ? formData.tipo.toLowerCase() : '');
      payload.append('fechaCumple', isoFecha);

      if (idPlan) payload.append('ID_Plan', idPlan);
      if (formData.tipo === 'Entrenador' && formData.profesion) {
        payload.append('profesion', formData.profesion.trim());
      }
      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      await apiClient.post('/usuarios', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Usuario añadido correctamente');
      setFormData(initialFormData);
      setAvatarFile(null);
      setAvatarPreview("");
      navigate("/admin/usuarios");
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.message || 'No se pudo registrar el usuario';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const tipos = ['Cliente', 'Entrenador', 'Admin'];

  return (
    <div className="page-layout">
      {isLoading && <LoaderFullScreen />}
      <SidebarMenu isAdmin={fromAdmin} isEntrenador={fromEntrenador} />
      <div className="content-layout">
        <h2>Crear usuario</h2>

        <form
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '320px',
            paddingTop: '30px',
          }}
        >
          <label htmlFor="email">Email:</label>
          <CustomInput
            type="email" id="email" name="email"
            value={formData.email} onChange={handleChange}
            required placeholder="Ingresa tu email"
          />

          <label htmlFor="password">Contraseña:</label>
          <CustomInput
            type="password" id="password" name="password"
            value={formData.password} onChange={handleChange}
            required placeholder="Ingresa tu contraseña"
          />

          <label htmlFor="nombre">Nombre:</label>
          <CustomInput
            type="text" id="nombre" name="nombre"
            value={formData.nombre} onChange={handleChange}
            placeholder="Ingresa el nombre"
          />

          <label htmlFor="apellido">Apellido:</label>
          <CustomInput
            type="text" id="apellido" name="apellido"
            value={formData.apellido} onChange={handleChange}
            placeholder="Ingresa el apellido"
          />

          <label htmlFor="tipo">Tipo de usuario:</label>
          <CustomDropdown
            options={tipos}
            value={formData.tipo}
            onChange={(val) =>
              setFormData(f => ({
                ...f,
                tipo: typeof val === 'string' ? val : val.target.value,
              }))
            }
            name="tipo" id="tipo"
          />

          {formData.tipo === 'Cliente' && (
            <>
              <label htmlFor="plan">Plan:</label>
              <CustomDropdown
                options={planOptions.map(p => p.label)}
                value={formData.plan}
                onChange={(e) =>
                  setFormData(f => ({ ...f, plan: (e?.target?.value ?? '') }))
                }
                name="plan" id="plan"
              />
            </>
          )}

          {formData.tipo === 'Entrenador' && (
            <>
              <label htmlFor="profesion">Profesión:</label>
              <CustomInput
                type="text" id="profesion" name="profesion"
                value={formData.profesion} onChange={handleChange}
                placeholder="Ingresa la profesión"
              />
            </>
          )}

          <label htmlFor="direc">Dirección:</label>
          <CustomInput
            type="text" id="direc" name="direc"
            value={formData.direc} onChange={handleChange}
            placeholder="Ingresa la dirección"
          />

          <label htmlFor="tel">Teléfono:</label>
          <CustomInput
            type="tel" id="tel" name="tel"
            value={formData.tel} onChange={handleChange}
            placeholder="Ingresa el teléfono"
          />

          <label htmlFor="fechaCumple">Fecha de Nacimiento:</label>
          <CustomInput
            type="date" id="fechaCumple" name="fechaCumple"
            value={formData.fechaCumple} onChange={handleChange}
          />

          <label htmlFor="avatar">Avatar:</label>
          <input
            type="file" id="avatar" name="avatar"
            accept="image/*" onChange={handleFileChange}
          />

          {avatarPreview && (
            <div className="preview-container">
              <img
                src={avatarPreview} alt="Preview clase"
                className="preview-img" width={300}
              />
            </div>
          )}

          {/* El botón solo como submit, el onClick ya no hace falta */}
          <PrimaryButton text={isLoading ? "Creando..." : "Crear usuario"} type="submit" disabled={isLoading} onClick={handleSubmit} />
        </form>
      </div>
    </div>
  );
};

export default CrearUsuario;