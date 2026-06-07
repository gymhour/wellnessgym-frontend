import React, { useEffect, useState, useCallback } from "react";
import "../../../App.css";
import "./clasesActividadesForm.css";
import SidebarMenu from "../../../Components/SidebarMenu/SidebarMenu";
import SecondaryButton from "../../../Components/utils/SecondaryButton/SecondaryButton";
import { ArrowLeft, PlusCircle, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../../axiosConfig";
import apiService from "../../../services/apiService";
import CustomDropdown from "../../../Components/utils/CustomDropdown/CustomDropdown";
import { toast } from "react-toastify";
import LoaderFullScreen from "../../../Components/utils/LoaderFullScreen/LoaderFullScreen";
import CustomInput from "../../../Components/utils/CustomInput/CustomInput";
import ConfirmationPopup from "../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp";

// ——————————————————————————————————————————
// Utils de día/horario (hora “de pared” → ISO Z)
// ——————————————————————————————————————————
const normalizeDay = (d) =>
  (d || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Lunes=0 ... Domingo=6 (semana comienza en lunes)
const dayIndexFromSpanish = (d) => {
  const key = normalizeDay(d);
  const map = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6 };
  return map[key] ?? 0;
};

// Devuelve Date local a las 00:00
const startOfDayLocal = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Lunes de la semana actual (local)
const getMondayThisWeek = (ref = new Date()) => {
  const d = startOfDayLocal(ref);
  const jsDay = d.getDay(); // 0=Dom..6=Sab
  const daysSinceMonday = (jsDay + 6) % 7; // Lun=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMonday);
  return monday;
};

// Fecha local de la semana que viene para un índice de día (Lun=0..Dom=6)
const getNextWeekDateForDayIndex = (dayIdx) => {
  const mondayThis = getMondayThisWeek();
  const mondayNext = new Date(mondayThis);
  mondayNext.setDate(mondayThis.getDate() + 7);
  const target = new Date(mondayNext);
  target.setDate(mondayNext.getDate() + (dayIdx || 0));
  return target; // local midnight
};

// Convierte "HH:mm"+día → ISO Z manteniendo la “hora de pared”
const toISOZSameClockTime = (hhmm, diaSemana) => {
  if (!hhmm || !diaSemana) return "";
  const [hh, mm] = (hhmm || "00:00").split(":");
  const idx = dayIndexFromSpanish(diaSemana);
  const base = getNextWeekDateForDayIndex(idx); // fecha (00:00) de la semana próxima para ese día
  return new Date(
    Date.UTC(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Number(hh) || 0,
      Number(mm) || 0,
      0,
      0
    )
  ).toISOString();
};

// Key por fila para manejar edición/estado
const rowKey = (h, idx) => (h.idHorarioClase ? `id-${h.idHorarioClase}` : `new-${idx}`);

const ClasesActividadesForm = ({ isEditing, classId: classIdProp, fromAdmin, fromEntrenador }) => {
  const navigate = useNavigate();
  const { id: classIdParam } = useParams();
  const classId = isEditing ? classIdProp ?? classIdParam : null;

  // ——————————————————————————————————————————
  // Estado local
  // ——————————————————————————————————————————
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Solo mostramos horarios activos; mantenemos 'activo' por compatibilidad
  const [horarios, setHorarios] = useState([
    { diaSemana: "", horaIni: "", horaFin: "", cupos: "", idHorarioClase: null, activo: true }
  ]);

  const [entrenadores, setEntrenadores] = useState([]);
  const [initialEntrenadores, setInitialEntrenadores] = useState([]);
  const [selectedEntrenadores, setSelectedEntrenadores] = useState([]);
  const [dropdownValue, setDropdownValue] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // snapshot de horarios iniciales (para revertir al cancelar edición)
  const [initialHorariosMap, setInitialHorariosMap] = useState({}); // { [idHorarioClase]: {diaSemana, horaIni, horaFin, cupos, activo} }

  // Estado de edición por fila y modo por fila
  const [editingRowMap, setEditingRowMap] = useState({}); // key->bool
  const [rowUpdateMode, setRowUpdateMode] = useState({}); // key->"preserve" | "instant"

  // Modal de confirmación de borrado
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // Popup para elegir modo ANTES de guardar
  const [editModeDialog, setEditModeDialog] = useState({
    open: false,
    idx: null,
    key: null,
    mode: "preserve", // default
  });

  // Slots 30'
  const generateTimeSlots = () => {
    const slots = [];
    for (let m = 0; m < 24 * 60; m += 30) {
      const h = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${h}:${mm}`);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  // ——————————————————————————————————————————
  // 2) Cargar entrenadores
  // ——————————————————————————————————————————
  useEffect(() => {
    apiService
      .getEntrenadores()
      .then((resp) => setEntrenadores(resp.data ?? resp))
      .catch((err) => console.error("Error al obtener entrenadores", err));
  }, []);

  // ——————————————————————————————————————————
  // 3) Si editando, cargar datos de clase (helper reutilizable)
  // ——————————————————————————————————————————
  const fetchClaseDetalle = useCallback(async () => {
    if (!isEditing || !classId) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/clase/horario/${classId}`);
      const {
        nombre: nombreAPI,
        descripcion: descripcionAPI,
        imagenClase,
        HorariosClase,
        Entrenadores: entrenadoresIniciales
      } = data;

      setNombre(nombreAPI);
      setDescripcion(descripcionAPI);

      // Solo activos
      const formatted = (HorariosClase ?? [])
        .filter((h) => h.activo !== false)
        .map((h) => ({
          diaSemana: h.diaSemana,
          horaIni: (h.horaIni ?? "").substr(11, 5), // "2025-09-11T07:00:00.000Z" -> "07:00"
          horaFin: (h.horaFin ?? "").substr(11, 5),
          cupos: h.cupos,
          idHorarioClase: h.ID_HorarioClase,
          activo: true
        }));

      setHorarios(
        formatted.length > 0
          ? formatted
          : [{ diaSemana: "", horaIni: "", horaFin: "", cupos: "", idHorarioClase: null, activo: true }]
      );

      const map = {};
      for (const h of formatted) {
        if (h.idHorarioClase) {
          map[h.idHorarioClase] = {
            diaSemana: h.diaSemana,
            horaIni: h.horaIni,
            horaFin: h.horaFin,
            cupos: Number(h.cupos),
            activo: h.activo
          };
        }
      }
      setInitialHorariosMap(map);

      setImagePreview(imagenClase);
      setImage(null);

      const init = (entrenadoresIniciales ?? []);
      setSelectedEntrenadores(init);
      setInitialEntrenadores(init);

      // reset UI de edición por fila
      setEditingRowMap({});
      setRowUpdateMode({});
    } catch (error) {
      console.error("Error al obtener los detalles de la clase:", error);
      toast.error("Error al obtener información de la clase. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }, [isEditing, classId]);

  useEffect(() => {
    fetchClaseDetalle();
  }, [fetchClaseDetalle]);

  // ——————————————————————————————————————————
  // 4) Entrenadores (UI)
  // ——————————————————————————————————————————
  const handleSelectEntrenador = (nombreCompleto) => {
    const ent = entrenadores.find((e) => `${e.nombre} ${e.apellido}` === nombreCompleto);
    if (!ent) return;
    if (!selectedEntrenadores.some((s) => s.ID_Usuario === ent.ID_Usuario)) {
      setSelectedEntrenadores((prev) => [...prev, ent]);
    }
  };
  const handleRemoveEntrenador = (ID_Usuario) => {
    setSelectedEntrenadores((prev) => prev.filter((e) => e.ID_Usuario !== ID_Usuario));
  };

  // ——————————————————————————————————————————
  // 5) Imagen
  // ——————————————————————————————————————————
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ——————————————————————————————————————————
  // 6) Horarios (UI)
  // ——————————————————————————————————————————
  const handleAddHorario = () => {
    setHorarios((prev) => [
      ...prev,
      { diaSemana: "", horaIni: "", horaFin: "", cupos: "", idHorarioClase: null, activo: true }
    ]);
  };

  const handleHorarioChange = (e, idx) => {
    const { name, value } = e.target;
    const h = horarios[idx];
    const key = rowKey(h, idx);

    // Si es existente y NO está en modo edición, no permitir
    if (h.idHorarioClase && !editingRowMap[key]) return;

    setHorarios((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [name]: value };
      return copy;
    });
  };

  const enterEditRow = (idx) => {
    const h = horarios[idx];
    const key = rowKey(h, idx);
    setEditingRowMap((m) => ({ ...m, [key]: true }));
    setRowUpdateMode((m) => ({ ...m, [key]: "preserve" })); // default por fila
  };

  const cancelEditRow = (idx) => {
    const h = horarios[idx];
    const key = rowKey(h, idx);

    setHorarios((prev) => {
      const copy = [...prev];
      // Si es nuevo, lo quitamos directamente
      if (!h.idHorarioClase) {
        copy.splice(idx, 1);
      } else {
        // Revertir al snapshot
        const snap = initialHorariosMap[h.idHorarioClase];
        if (snap) {
          copy[idx] = {
            ...h,
            diaSemana: snap.diaSemana,
            horaIni: snap.horaIni,
            horaFin: snap.horaFin,
            cupos: snap.cupos,
            activo: snap.activo
          };
        }
      }
      return copy;
    });

    setEditingRowMap((m) => ({ ...m, [key]: false }));
  };

  // Guardar fila NUEVA → POST /clase/:ID_Clase/horarioClase
  const saveNewRow = async (idx) => {
    if (!classId) {
      toast.error("No se pudo identificar la clase.");
      return;
    }
    const h = horarios[idx];

    if (!h.diaSemana || !h.horaIni || !h.horaFin || !h.cupos) {
      toast.error("Completa día, inicio, fin y cupos antes de guardar.");
      return;
    }

    const payload = {
      diaSemana: h.diaSemana,
      horaIni: toISOZSameClockTime(h.horaIni, h.diaSemana),
      horaFin: toISOZSameClockTime(h.horaFin, h.diaSemana),
      cupos: Number(h.cupos)
    };

    setIsLoading(true);
    try {
      await apiClient.post(`/clase/${classId}/horarioClase`, payload);
      toast.success("Horario creado.");
      await fetchClaseDetalle(); // refresco para obtener ID_HorarioClase, etc.
    } catch (error) {
      console.error(error);
      toast.error("No se pudo crear el horario.");
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar edición de fila EXISTENTE → POST /clase/horario/:ID_HorarioClase/modify
  const saveExistingRow = async (idx, modeOverride) => {
    const h = horarios[idx];
    if (!h.idHorarioClase) return;

    const key = rowKey(h, idx);
    const mode = modeOverride || rowUpdateMode[key] || "preserve";

    if (!h.diaSemana || !h.horaIni || !h.horaFin || !h.cupos) {
      toast.error("Completa día, inicio, fin y cupos antes de guardar.");
      return;
    }

    const payload = {
      updateMode: mode,
      diaSemana: h.diaSemana,
      horaIni: toISOZSameClockTime(h.horaIni, h.diaSemana),
      horaFin: toISOZSameClockTime(h.horaFin, h.diaSemana),
      cupos: Number(h.cupos)
    };

    setIsLoading(true);
    try {
      await apiClient.post(`/clase/horario/${h.idHorarioClase}/modify`, payload);
      toast.success("Horario y turnos asociados actualizados.");
      await fetchClaseDetalle();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo actualizar el horario.");
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar fila EXISTENTE → modal + DELETE /clase/horarioClase/:ID_HorarioClase
  const requestDeleteRow = (idx) => {
    const h = horarios[idx];
    if (!h.idHorarioClase) {
      // si es nuevo sin guardar, simplemente quitarlo
      setHorarios((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    setConfirmDelete({ open: true, id: h.idHorarioClase });
  };

  const confirmDeleteHorario = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    setIsLoading(true);
    try {
      await apiClient.delete(`/clase/horarioClase/${id}`);
      toast.success("Horario eliminado.");
      await fetchClaseDetalle();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar el horario.");
    } finally {
      setIsLoading(false);
      setConfirmDelete({ open: false, id: null });
    }
  };

  // ——— POPUP DE MODO ANTES DE GUARDAR ———
  const requestModeBeforeSave = (idx) => {
    const h = horarios[idx];
    const key = rowKey(h, idx);
    const current = rowUpdateMode[key] || "preserve";
    setEditModeDialog({ open: true, idx, key, mode: current });
  };

  const confirmSaveWithMode = () => {
    const { idx, key, mode } = editModeDialog;
    if (idx == null || !key) return;

    // Guardamos preferencia (opcional)
    setRowUpdateMode((m) => ({ ...m, [key]: mode }));

    // Cerrar popup y ejecutar guardado con el modo elegido
    setEditModeDialog({ open: false, idx: null, key: null, mode: "preserve" });
    saveExistingRow(idx, mode);
  };

  // ——————————————————————————————————————————
  // 7) Submit (crear/editar CLASE)
  // ——————————————————————————————————————————
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const dataForm = new FormData();
    dataForm.append("nombre", nombre);
    dataForm.append("descripcion", descripcion);
    if (image) dataForm.append("image", image);

    if (isEditing) {
      // ✅ Ahora SOLO nombre/descr/imagen
      apiClient
        .put(`/clase/clase/${classId}`, dataForm, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(async () => {
          // Sincronizar entrenadores como antes
          const origIds = initialEntrenadores.map((e) => e.ID_Usuario);
          const newIds = selectedEntrenadores.map((e) => e.ID_Usuario);
          const toAdd = newIds.filter((id) => !origIds.includes(id));
          const toRemove = origIds.filter((id) => !newIds.includes(id));

          await Promise.all([
            ...toAdd.map((id) => apiService.addEntrenadorToClase(classId, id)),
            ...toRemove.map((id) => apiService.removeEntrenadorFromClase(classId, id)),
          ]);

          if (fromAdmin) navigate("/admin/clases-actividades");
          else if (fromEntrenador) navigate("/entrenador/clases-actividades");

          toast.success("Clase actualizada.");
        })
        .catch((error) => {
          if (error?.code === "ERR_NETWORK") {
            toast.error("La foto es muy grande o hubo un problema de red.");
          } else {
            toast.error("Error actualizando la clase.");
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      // Crear clase (POST original con horarios embebidos)
      const onlyEditable = horarios.filter((h) => h.activo !== false);

      const transformedHorarios = onlyEditable.map((h) => ({
        diaSemana: h.diaSemana,
        horaIni: toISOZSameClockTime(h.horaIni, h.diaSemana),
        horaFin: toISOZSameClockTime(h.horaFin, h.diaSemana),
        cupos: Number(h.cupos)
      }));

      dataForm.append("horarios", JSON.stringify(transformedHorarios));

      const entrenadorIds = selectedEntrenadores.map((e) => e.ID_Usuario);
      dataForm.append("entrenadores", JSON.stringify(entrenadorIds));

      apiClient
        .post("/clase/horario", dataForm, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(async ({ data }) => {
          const idNuevaClase = data?.clase?.ID_Clase;
          if (idNuevaClase) {
            await Promise.all(
              entrenadorIds.map((id) => apiService.addEntrenadorToClase(idNuevaClase, id))
            );
          }
          if (fromAdmin) navigate("/admin/clases-actividades");
          else if (fromEntrenador) navigate("/entrenador/clases-actividades");

          toast.success("Clase creada y entrenadores asignados exitosamente.");
          resetForm();
        })
        .catch((error) => {
          if (error?.code === "ERR_NETWORK") {
            toast.error("La foto es muy grande o hubo un problema de red.");
          } else {
            toast.error("Error al crear la clase o asignar entrenadores.");
          }
        })
        .finally(() => setIsLoading(false));
    }
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setImage(null);
    setImagePreview("");
    setHorarios([{ diaSemana: "", horaIni: "", horaFin: "", cupos: "", idHorarioClase: null, activo: true }]);
    setSelectedEntrenadores([]);
    setDropdownValue("");
    setInitialHorariosMap({});
    setEditingRowMap({});
    setRowUpdateMode({});
  };

  return (
    <div className="page-layout">
      {isLoading && <LoaderFullScreen />}
      <SidebarMenu isAdmin={fromAdmin} isEntrenador={fromEntrenador} />
      <div className="content-layout">
        <div className="clases-actividades-form-ctn">
          <div className="clases-actividades-form-title">
            <SecondaryButton
              text="Volver atrás"
              linkTo={fromAdmin ? "/admin/clases-actividades" : "/entrenador/clases-actividades"}
              icon={ArrowLeft}
              reversed={true}
            />
            <h2>{isEditing ? "Editar clase o actividad" : "Crear nueva clase o actividad"}</h2>
          </div>

          <div className="create-clase-form">
            <form encType="multipart/form-data" onSubmit={handleSubmit}>
              {/* Nombre */}
              <div className="form-input-ctn">
                <label>Nombre:</label>
                <CustomInput
                  id="nombre"
                  type="text"
                  width="100%"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required={true}
                />
              </div>

              {/* Descripción */}
              <div className="form-input-ctn form-input-ctn--full">
                <label htmlFor="descripcion">Descripción:</label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                />
              </div>

              {/* Imagen */}
              <div className="form-input-ctn form-input-ctn--full">
                <label htmlFor="imagen">Imagen:</label>
                <input type="file" id="imagen" onChange={handleImageChange} />
                {imagePreview && (
                  <div className="preview-container">
                    <img
                      src={imagePreview}
                      alt="Preview clase"
                      className="preview-img"
                      width={300}
                    />
                  </div>
                )}
              </div>

              {/* Entrenadores */}
              <div className="form-input-ctn form-input-ctn--full">
                <label htmlFor="entrenadores">Entrenadores:</label>
                <CustomDropdown
                  id="entrenadores"
                  name="entrenadores"
                  options={entrenadores.filter(e => e.estado).map((e) => `${e.nombre} ${e.apellido}`)}
                  placeholderOption="Seleccionar entrenador"
                  value={dropdownValue}
                  onChange={(e) => {
                    handleSelectEntrenador(e.target.value);
                    setDropdownValue("");
                  }}
                />
                <div className="selected-tags">
                  {selectedEntrenadores.map((ent) => (
                    <div key={ent.ID_Usuario} className="tag">
                      <span>{`${ent.nombre} ${ent.apellido}`}</span>
                      <X
                        className="tag-close"
                        width={20}
                        height={20}
                        onClick={() => handleRemoveEntrenador(ent.ID_Usuario)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Horarios */}
              <div className="form-input-horarios">
                <label>Horarios (solo se muestran activos):</label>

                {horarios
                  .filter((h) => h.activo !== false)
                  .map((horario, idx) => {
                    const isInactive = horario.activo === false; // por si en un futuro llegan inactivos
                    const key = rowKey(horario, idx);
                    const isEditingRow = !!editingRowMap[key];
                    const isExisting = !!horario.idHorarioClase;

                    return (
                      <div
                        key={horario.idHorarioClase ?? `new-${idx}`}
                        className={`horario-item ${isInactive ? "horario-item--inactive" : ""}`}
                        style={isInactive ? { opacity: 0.6 } : undefined}
                      >
                        {/* Día */}
                        <div className="form-input-ctn-horario">
                          <label>Día de la semana</label>
                          <select
                            name="diaSemana"
                            value={horario.diaSemana}
                            onChange={(e) => handleHorarioChange(e, idx)}
                            required
                            disabled={isInactive || (isExisting && !isEditingRow)}
                          >
                            <option value="">Seleccionar día</option>
                            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sabado", "Domingo"].map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        {/* Inicio */}
                        <div className="form-input-ctn-horario">
                          <label>Hr. Inicio</label>
                          <select
                            name="horaIni"
                            value={horario.horaIni}
                            onChange={(e) => handleHorarioChange(e, idx)}
                            required
                            disabled={isInactive || (isExisting && !isEditingRow)}
                          >
                            <option value="">Seleccionar horario</option>
                            {timeSlots.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Fin */}
                        <div className="form-input-ctn-horario">
                          <label>Hr. Fin</label>
                          <select
                            name="horaFin"
                            value={horario.horaFin}
                            onChange={(e) => handleHorarioChange(e, idx)}
                            required
                            disabled={isInactive || (isExisting && !isEditingRow)}
                          >
                            <option value="">Seleccionar horario</option>
                            {timeSlots.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Cupos */}
                        <div className="form-input-ctn-horario">
                          <label>Cupos</label>
                          <input
                            type="number"
                            min={1}
                            name="cupos"
                            placeholder="Cupos"
                            value={horario.cupos}
                            onChange={(e) => handleHorarioChange(e, idx)}
                            required
                            disabled={isInactive || (isExisting && !isEditingRow)}
                          />
                        </div>

                        {/* Acciones por fila */}
                        <div className="form-input-ctn-horario actions-col">
                          {isExisting ? (
                            !isEditingRow ? (
                              <div className="row-actions">
                                {/* EDITAR → habilita campos */}
                                <SecondaryButton text="Editar" onClick={() => enterEditRow(idx)} />
                                <X className="close-icon" onClick={() => requestDeleteRow(idx)} />
                              </div>
                            ) : (
                              <div className="row-actions edit-mode">
                                {/* GUARDAR → abre popup para elegir modo */}
                                <SecondaryButton text="Guardar" onClick={() => requestModeBeforeSave(idx)} />
                                <SecondaryButton text="Cancelar" onClick={() => cancelEditRow(idx)} />
                              </div>
                            )
                          ) : (
                            // Fila NUEVA
                            <div className="row-actions">
                              <SecondaryButton text="Guardar" onClick={() => saveNewRow(idx)} />
                              <X className="close-icon" onClick={() => cancelEditRow(idx)} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                <div className="clase-actividad-form-agg-horario-btn">
                  <SecondaryButton text="Agregar horario" icon={PlusCircle} onClick={handleAddHorario} />
                </div>
              </div>

              {/* Submit (CLASE) */}
              <div className="clase-actividad-form-guardar-btn">
                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isEditing ? "Guardar cambios" : "Crear Clase"}
                </button>
              </div>
            </form>
          </div>

          {/* Modal confirmación eliminar */}
          <ConfirmationPopup
            isOpen={confirmDelete.open}
            onClose={() => setConfirmDelete({ open: false, id: null })}
            onConfirm={() => confirmDeleteHorario()}
            message="¿Seguro que querés eliminar este horario? Esto también eliminará todos los turnos existentes asociados."
          />

          {/* Popup para elegir modo antes de GUARDAR una fila existente */}
          <ConfirmationPopup
            isOpen={editModeDialog.open}
            onClose={() => setEditModeDialog({ open: false, idx: null, key: null, mode: "preserve" })}
            onConfirm={confirmSaveWithMode}
            message="¿Cómo querés aplicar los cambios en este horario?"
          >
            <div className="editmode-explainer">
              <label className="editmode-option">
                <input
                  type="radio"
                  name="editmode"
                  value="preserve"
                  checked={editModeDialog.mode === "preserve"}
                  onChange={() => setEditModeDialog((s) => ({ ...s, mode: "preserve" }))}
                />
                <div>
                  <strong>Preserva</strong>
                  <p>Actualiza el horario preservando los turnos activos.</p>
                </div>
              </label>

              <label className="editmode-option">
                <input
                  type="radio"
                  name="editmode"
                  value="instant"
                  checked={editModeDialog.mode === "instant"}
                  onChange={() => setEditModeDialog((s) => ({ ...s, mode: "instant" }))}
                />
                <div>
                  <strong>Instantaneo</strong>
                  <p>Actualiza el horario de todos los turnos, incluyendo los activos.</p>
                </div>
              </label>
            </div>
          </ConfirmationPopup>

        </div>
      </div>
    </div>
  );
};

export default ClasesActividadesForm;
