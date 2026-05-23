import React, { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import apiService, { fetchAllClientsActive } from '../../../services/apiService';
import { toast } from 'react-toastify';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import './RutinasAsignadas.css';
import PrimaryButton from '../../../Components/utils/PrimaryButton/PrimaryButton';
import { Edit2, Trash2, ChevronDown, ChevronUp, Copy, Video } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import SecondaryButton from '../../../Components/utils/SecondaryButton/SecondaryButton';
import ConfirmationPopup from '../../../Components/utils/ConfirmationPopUp/ConfirmationPopUp';

/* ===================== Helpers ===================== */
const WEEK_ORDER = [
  'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo',
  'Miércoles', 'Sábado'
];

const isDiaN = (k) => /^dia(\d+)$/i.test(k);
const diaNIndex = (k) => {
  const m = /^dia(\d+)$/i.exec(k);
  return m ? parseInt(m[1], 10) : Infinity;
};

const smartSortDiaKeys = (diasObj) => {
  const keys = Object.keys(diasObj || {});
  if (!keys.length) return keys;

  const hasAnyDiaN = keys.some(isDiaN);
  if (hasAnyDiaN) {
    const sinDia = keys.filter(k => k === 'sin_dia');
    const diaNs = keys.filter(isDiaN).sort((a, b) => diaNIndex(a) - diaNIndex(b));
    const others = keys.filter(k => !isDiaN(k) && k !== 'sin_dia').sort((a, b) => a.localeCompare(b));
    return [...diaNs, ...others, ...sinDia];
  }

  const sinDia = keys.filter(k => k === 'sin_dia');
  const week = keys.filter(k => WEEK_ORDER.includes(k))
    .sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
  const others = keys.filter(k => !WEEK_ORDER.includes(k) && k !== 'sin_dia').sort((a, b) => a.localeCompare(b));
  return [...week, ...others, ...sinDia];
};

const normalizeDias = (rutina) => {
  const d = rutina?.dias || {};
  const ordered = smartSortDiaKeys(d);
  return ordered.map((key, idx) => ({
    key,
    nombre: d[key]?.nombre || key || `Día ${idx + 1}`,
    descripcion: d[key]?.descripcion || '',
    bloques: Array.isArray(d[key]?.bloques) ? d[key].bloques : []
  }));
};

const getBloqueItems = (b) => Array.isArray(b?.ejercicios) ? b.ejercicios : [];

/* ===== Etiquetas por tipo (incluye TABATA mejorado) ===== */
const formatWorkRest = (str = '') => {
  const s = String(str).trim();
  if (!s) return '';
  const txt = s
    .replace(/on|trabajo/gi, '')
    .replace(/off|descanso/gi, '')
    .replace(/[x×]/g, '/')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();
  const [work, rest] = txt.split('/');
  if (work && rest) return `${work.trim()} trabajo × ${rest.trim()} descanso`;
  return s;
};

const blockLabel = (b) => {
  switch (b?.type) {
    case 'SETS_REPS': return '';
    case 'ROUNDS': return b?.cantRondas ? `${b.cantRondas} rondas de:` : 'Rondas:';
    case 'EMOM': return b?.durationMin ? `EMOM ${b.durationMin}min:` : 'EMOM:';
    case 'AMRAP': return b?.durationMin ? `AMRAP ${b.durationMin}min:` : 'AMRAP:';
    case 'TABATA': {
      const chips = [];
      if (b?.cantSeries) chips.push(`${b.cantSeries} series`);
      if (b?.tiempoTrabajoDescansoTabata) chips.push(formatWorkRest(b.tiempoTrabajoDescansoTabata));
      if (chips.length) return `Tabata — ${chips.join(' · ')}`;
      if (b?.durationMin) return `Tabata ${b.durationMin}min:`;
      return 'TABATA:';
    }
    case 'LADDER': return b?.tipoEscalera || 'Escalera';
    default: return '';
  }
};

const itemText = (it, tipo) => {
  const name = it?.ejercicio?.nombre || 'Ejercicio';
  const reps = (it?.reps ?? '').toString().trim();
  const extra = (it?.setRepWeight ?? '').toString().trim();
  const showExtra = extra && extra.toLowerCase() !== name.toLowerCase();

  if (tipo === 'LADDER') return showExtra ? `${name} — ${extra}` : name;

  const left = reps ? `${reps} ${name}` : name;
  return showExtra ? `${left} — ${extra}` : left;
};

// ====== Links a ejercicios (misma UX) ======
const isLinkableExercise = (it) => {
  const ej = it?.ejercicio;
  return !!(ej?.ID_Ejercicio && ej?.esGenerico === false);
};

const renderEjercicioItem = (it, tipo) => {
  const txt = itemText(it, tipo);
  if (isLinkableExercise(it)) {
    const id = it.ejercicio.ID_Ejercicio;
    return (
      <span className="ejercicio-link-wrap">
        <Link
          to={`/entrenador/ejercicios/${id}`}
          className="ejercicio-link"
          title="Ver detalle del ejercicio"
        >
          {txt}
        </Link>
        <Video className="video-icon" aria-hidden="true" size={16} />
      </span>
    );
  }
  return <span>{txt}</span>;
};

// Fallback para SETS_REPS sin ejercicios
const setsRepsFallback = (b) => {
  const parts = [
    b?.setsReps ? `${b.setsReps}` : '',
    b?.nombreEj ? `${b.nombreEj}` : '',
    b?.weight ? `— ${b.weight}` : ''
  ].filter(Boolean);
  const txt = parts.join(' ').trim();
  return txt || null;
};

/* ======== DROPSET detection & rendering ======== */
/** Devuelve true si es un dropset: bloque SETS_REPS con 2+ items del mismo ejercicio */
const isDropSetBlock = (b) => {
  if (!b || b.type !== 'SETS_REPS') return false;
  const items = getBloqueItems(b);
  if (!Array.isArray(items) || items.length < 2) return false;

  // Comparamos por ID si existe, si no por nombre
  const firstId = items[0]?.ejercicio?.ID_Ejercicio ?? items[0]?.ID_Ejercicio ?? null;
  const firstName = (items[0]?.ejercicio?.nombre || b?.nombreEj || '').trim().toLowerCase();

  return items.every(it => {
    const id = it?.ejercicio?.ID_Ejercicio ?? it?.ID_Ejercicio ?? null;
    const name = (it?.ejercicio?.nombre || '').trim().toLowerCase();
    if (firstId != null && id != null) return id === firstId;
    return name && name === firstName;
  });
};

/** Formatea “reps -- weight” con × */
const repsWeightLine = (it) => {
  const reps = (it?.reps || '').toString().replace(/x/gi, '×').trim();
  const w = (it?.setRepWeight || '').toString().trim();
  if (reps && w) return `${reps} - ${w}`;
  if (reps) return reps;
  if (w) return w;
  return '—';
};

/** Render para dropset */
const renderDropSetBlock = (b) => {
  const items = getBloqueItems(b);
  if (!items || items.length === 0) return null;

  const firstItem = items[0] || {};
  const ej = firstItem.ejercicio || {};
  const nombre = (b?.nombreEj || ej?.nombre || 'Ejercicio').trim();

  // Reutilizamos la misma regla de link que en otros bloques
  const hasLink = isLinkableExercise(firstItem); // usa ej.ID_Ejercicio && !ej.esGenerico

  const titleNode = hasLink ? (
    <span className="ejercicio-link-wrap">
      <Link
        to={`/entrenador/ejercicios/${ej.ID_Ejercicio}`}
        className="ejercicio-link"
        title="Ver detalle del ejercicio"
      >
        {nombre}
      </Link>
      <Video className="video-icon" aria-hidden="true" size={16} />
    </span>
  ) : (
    <span>{nombre}</span>
  );

  return (
    <div className="bloque-card dropset-card">
      <p className="bloque-header">
        DROPSET — {titleNode}
      </p>
      <ul className="bloque-list dropset-list">
        {items.map((it, idx) => (
          <li key={idx}>{repsWeightLine(it)}</li>
        ))}
      </ul>
    </div>
  );
};

// ====== Component rendering helper for blocks ======
const renderBloques = (bloques) => {
  return (bloques || []).map((b, i) => {
    const items = getBloqueItems(b);
    const header = blockLabel(b);

    if (b.type === 'SETS_REPS') {
      if (isDropSetBlock(b)) {
        return <React.Fragment key={i}>{renderDropSetBlock(b)}</React.Fragment>;
      }
      const fallback = items.length === 0 ? setsRepsFallback(b) : null;
      return (
        <div key={i} className='bloque-card'>
          {(items.length > 0) ? (
            <ul className='bloque-list'>
              {items.map((it, j) => (
                <li key={j}>{renderEjercicioItem(it, b.type)}</li>
              ))}
            </ul>
          ) : (
            fallback && (
              <ul className='bloque-list'>
                <li>{fallback}</li>
              </ul>
            )
          )}
        </div>
      );
    }

    return (
      <div key={i} className='bloque-card'>
        {header && <p className='bloque-header'>{header}</p>}
        {items.length > 0 && (
          <ul className='bloque-list'>
            {items.map((it, j) => (
              <li key={j}>{renderEjercicioItem(it, b.type)}</li>
            ))}
          </ul>
        )}

        {b.type === 'TABATA' && (b?.cantSeries || b?.tiempoTrabajoDescansoTabata || b?.descTabata) && (
          <p className='bloque-footnote'>
            {b?.cantSeries ? <><b>Series:</b> {b.cantSeries} &middot; </> : null}
            {b?.tiempoTrabajoDescansoTabata
              ? <><b>Trabajo/Descanso:</b> {formatWorkRest(b.tiempoTrabajoDescansoTabata)} &middot; </>
              : null}
            {b?.descTabata ? <><b>Pausa entre series:</b> {b.descTabata}</> : null}
          </p>
        )}

        {b.type === 'ROUNDS' && b.descansoRonda != null && (
          <p className='bloque-footnote'>Descanso: {b.descansoRonda}s</p>
        )}
      </div>
    );
  });
};

const renderDiasContent = (dias, rutinaId, openState, toggleDia, prefix = '') => {
  if (!dias || dias.length === 0) return null;

  if (dias.length <= 1 && !prefix) {
    const d = dias[0];
    return (
      <div className='rutina-dia'>
        {d && <h4>{d.nombre}</h4>}
        {d?.descripcion && <p className='dia-desc'>{d.descripcion}</p>}
        {renderBloques(d.bloques)}
      </div>
    );
  }

  return (
    <div className='rutina-dias-accordion'>
      {dias.map((d, idx) => {
        const key = `${prefix}${d.key}`;
        const isOpen = !!openState?.[rutinaId]?.[key];
        return (
          <div key={key} className={`accordion-item ${isOpen ? 'open' : ''}`}>
            <button
              className='accordion-trigger'
              onClick={() => toggleDia(rutinaId, key)}
              aria-expanded={isOpen}
            >
              <span>{d.nombre || `Día ${idx + 1}`}</span>
              {isOpen ? <ChevronUp /> : <ChevronDown />}
            </button>
            {isOpen && (
              <div className='accordion-content'>
                {d.descripcion && <p className='dia-desc'>{d.descripcion}</p>}
                {renderBloques(d.bloques)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ==================================================== */

const customStyles = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'var(--primary-color)'
      : state.isFocused
        ? 'var(--background-hover-color)'
        : 'var(--background-color)',
    color: state.isSelected ? '#fff' : 'var(--text-color)',
    cursor: 'pointer',
    ':active': {
      backgroundColor: 'var(--background-hover-color)',
    },
  }),
  control: (provided) => ({
    ...provided,
    backgroundColor: 'var(--background-color-distinct)',
    borderColor: 'transparent',
    borderRadius: '12px',
    padding: '6px',
    boxShadow: 'none',
    color: 'var(--text-color)',
    width: '300px',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--background-color)',
    border: '1px solid var(--border-color)',
    zIndex: 100
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-color-distinct)',
  })
};

const RutinasAsignadas = () => {
  const [loading, setLoading] = useState(false);
  const [allRutinas, setAllRutinas] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [asignadasPorMi, setAsignadasPorMi] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedRutinaId, setSelectedRutinaId] = useState(null);
  const navigate = useNavigate();

  // estado de desplegables: { [ID_Rutina]: { [diaKey]: boolean } }
  const [openState, setOpenState] = useState({});

  useEffect(() => {
    fetchUsers();
    loadRutinasAsignadas();
  }, []);

  const fetchUsers = async () => {
    try {
      const clientes = await fetchAllClientsActive(apiService, { take: 100 });
      setUsers(clientes);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('No se pudieron cargar los usuarios para el filtro.');
    }
  };

  const loadRutinasAsignadas = async () => {
    setLoading(true);
    try {
      const { rutinas: lista = [] } = await apiService.getRutinasAsignadas();

      // abrir primer día por defecto por rutina
      const init = {};
      lista.forEach(r => {
        init[r.ID_Rutina] = {};
        if (r.semanas && r.semanas.length > 0) {
          const firstSem = r.semanas[0];
          const semKey = `sem_${firstSem.id || 0}`;
          init[r.ID_Rutina][semKey] = true;
          // open first day of first week
          const semDias = normalizeDias({ dias: firstSem.dias });
          if (semDias.length > 0) {
            init[r.ID_Rutina][`${semKey}_${semDias[0].key}`] = true;
          }
        } else {
          const dias = normalizeDias(r);
          if (dias.length > 0) {
            init[r.ID_Rutina][dias[0].key] = true;
          }
        }
      });

      setAllRutinas(lista);
      setRutinas(lista);
      setOpenState(init);
    } catch (error) {
      console.error('Error cargando rutinas:', error);
      toast.error('Error al cargar las rutinas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtrado = [...allRutinas];

    if (selectedUser) {
      const userId = Number(selectedUser.value);
      filtrado = filtrado.filter(r => Number(r?.alumno?.ID_Usuario) === userId);
    }

    if (asignadasPorMi) {
      const myId = Number(localStorage.getItem('usuarioId'));
      filtrado = filtrado.filter(r => Number(r?.ID_Entrenador) === myId || Number(r?.entrenador?.ID_Usuario) === myId);
    }

    setRutinas(filtrado);
  };

  const limpiarFiltros = () => {
    setSelectedUser(null);
    setAsignadasPorMi(false);
    setRutinas(allRutinas);
  };

  const openDeletePopup = id => {
    setSelectedRutinaId(id);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setSelectedRutinaId(null);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    if (selectedRutinaId) {
      try {
        await apiService.deleteRutina(selectedRutinaId);
        setAllRutinas(prev => prev.filter(r => r.ID_Rutina !== selectedRutinaId));
        setRutinas(prev => prev.filter(r => r.ID_Rutina !== selectedRutinaId));
        toast.success('Rutina eliminada correctamente.');
      } catch (error) {
        toast.error('Error al eliminar la rutina');
        console.error('Error al eliminar rutina', error);
      } finally {
        setLoading(false);
        closePopup();
      }
    }
  };

  const toggleDia = (rutinaId, diaKey) => {
    setOpenState(prev => ({
      ...prev,
      [rutinaId]: { ...(prev[rutinaId] || {}), [diaKey]: !prev?.[rutinaId]?.[diaKey] }
    }));
  };

  // ====== Duplicar rutina (incluye TABATA fields) ======
  const buildDuplicatePayload = (rutina) => {
    const entrenadorId = Number(localStorage.getItem('usuarioId')) || null;
    const alumnoId = rutina?.alumno?.ID_Usuario || null;

    const parseBloques = (bloquesArr) => {
      const bloques = Array.isArray(bloquesArr) ? bloquesArr : [];
      return bloques.map((b) => {
        const ejercicios = Array.isArray(b?.ejercicios) ? b.ejercicios : [];
        const bloqueEjercicios = ejercicios.map((it) => {
          const ejercicioId = it?.ejercicio?.ID_Ejercicio ?? it?.ID_Ejercicio ?? null;
          return {
            ejercicioId,
            reps: it?.reps ?? '',
            setRepWeight: (it?.setRepWeight ?? '').toString().trim() || undefined,
          };
        });

        return {
          type: b?.type || 'SETS_REPS',
          setsReps: b?.setsReps ?? null,
          nombreEj: b?.nombreEj ?? null,
          weight: b?.weight ?? null,
          descansoRonda: b?.descansoRonda ?? null,
          cantRondas: b?.cantRondas ?? null,
          durationMin: b?.durationMin ?? null,
          tipoEscalera: b?.tipoEscalera ?? null,
          cantSeries: b?.cantSeries ?? null,
          descTabata: b?.descTabata ?? null,
          tiempoTrabajoDescansoTabata: b?.tiempoTrabajoDescansoTabata ?? null,
          bloqueEjercicios,
        };
      });
    };

    const parseDias = (diasObj) => {
      const resultObj = {};
      Object.keys(diasObj || {}).forEach((diaKey, idx) => {
        const d = diasObj[diaKey] || {};
        resultObj[diaKey] = {
          nombre: d?.nombre || `Día ${idx + 1}`,
          descripcion: d?.descripcion || '',
          bloques: parseBloques(d.bloques)
        };
      });
      return resultObj;
    };

    const semanasPayload = {};
    if (Array.isArray(rutina?.semanas)) {
      rutina.semanas.forEach((s, idx) => {
        const key = `semana${idx + 1}`;
        semanasPayload[key] = {
          numero: s.numero || (idx + 1),
          nombre: s.nombre || `Semana ${idx + 1}`,
          dias: parseDias(s.dias),
        };
      });
    }

    return {
      ID_Usuario: alumnoId,
      ID_Entrenador: entrenadorId,
      nombre: `${rutina?.nombre || 'Rutina'} (1)`,
      desc: rutina?.desc || '',
      claseRutina: rutina?.claseRutina || 'Combinada',
      grupoMuscularRutina: rutina?.grupoMuscularRutina || 'Mixto',
      dias: parseDias(rutina?.dias),
      semanas: semanasPayload,
    };
  };

  const handleDuplicate = async (rutina) => {
    try {
      setLoading(true);
      const payload = buildDuplicatePayload(rutina);
      await apiService.createRutina(payload);
      toast.success('Rutina duplicada correctamente.');
      await loadRutinasAsignadas();
    } catch (error) {
      console.error('Error al duplicar rutina:', error);
      toast.error('No se pudo duplicar la rutina. Intente nuevamente.');
      setLoading(false);
    }
  };

  if (loading) return <LoaderFullScreen />;

  return (
    <div className='page-layout'>
      <SidebarMenu isAdmin={false} isEntrenador={true} />
      <div className='content-layout mi-rutina-ctn'>

        <div className='mi-rutina-title' style={{ marginBottom: '20px' }}>
          <h2>Rutinas asignadas</h2>
        </div>

        {/* ——— Filtro por usuario ——— */}
        <div className='rutinas-asignadas-filtro-ctn' style={{ flexWrap: 'wrap', gap: '15px' }}>
          <Select
            options={users.map(u => ({
              label: `${u.nombre} ${u.apellido} (${u.email})`,
              value: u.ID_Usuario
            }))}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder='Seleccioná un usuario'
            isClearable
            isSearchable
            styles={customStyles}
          />
          <div className="rutinas-asignadas-checkbox-ctn">
            <input
              type="checkbox"
              id="asignadasPorMi"
              checked={asignadasPorMi}
              onChange={(e) => setAsignadasPorMi(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
            />
            <label htmlFor="asignadasPorMi" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Asignadas por mi</label>
          </div>
          <div className="rutinas-asignadas-filtros-btns">
            <PrimaryButton onClick={handleSearch} text="Buscar" />
            <SecondaryButton onClick={limpiarFiltros} text="Limpiar" />
          </div>
        </div>

        {/* ——— Listado de rutinas ——— */}
        <div className='mis-rutinas-list'>
          {rutinas.length === 0 ? (
            <p>No tienes rutinas asignadas en este momento.</p>
          ) : rutinas.map(rutina => {
            const dias = normalizeDias(rutina);

            return (
              <div key={rutina.ID_Rutina} className='rutina-card'>
                <div className='rutina-header'>
                  <h3>{rutina.nombre}</h3>
                  <div className="rutina-header-acciones">
                    {/* Botón duplicar */}
                    <button
                      onClick={() => handleDuplicate(rutina)}
                      className='mi-rutina-eliminar-btn'
                      title='Duplicar rutina'
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => openDeletePopup(rutina.ID_Rutina)}
                      className='mi-rutina-eliminar-btn'
                      title='Eliminar rutina'
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      onClick={() => navigate(`/entrenador/editar-rutina/${rutina.ID_Rutina}`)}
                      className='mi-rutina-eliminar-btn'
                      title='Editar rutina'
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                </div>

                <div className='rutina-data'>
                  <p>Clase: {rutina.claseRutina || '—'}</p>
                  <p>Grupo muscular: {rutina.grupoMuscularRutina || '—'}</p>
                  <p>
                    {rutina.semanas && rutina.semanas.length > 0
                      ? `Semanas totales: ${rutina.semanas.length}`
                      : `Días totales: ${dias.length}`}
                  </p>
                </div>

                {/* ===== SEMANAS o DÍAS ===== */}
                {rutina.semanas && rutina.semanas.length > 0 ? (
                  <div className='rutina-semanas-accordion'>
                    {rutina.semanas.map((s, idx) => {
                      const key = `sem_${s.id || idx}`;
                      const isOpen = !!openState?.[rutina.ID_Rutina]?.[key];
                      const diasSemanales = normalizeDias({ dias: s.dias });

                      return (
                        <div key={key} className={`accordion-item semana-accordion ${isOpen ? 'open' : ''}`}>
                          <button
                            className='accordion-trigger semana-trigger'
                            onClick={() => toggleDia(rutina.ID_Rutina, key)}
                            aria-expanded={isOpen}
                            style={isOpen ? { borderLeft: '4px solid var(--primary-color)' } : {}}
                          >
                            <span>{s.nombre || `Semana ${s.numero || idx + 1}`}</span>
                            {isOpen ? <ChevronUp /> : <ChevronDown />}
                          </button>
                          {isOpen && (
                            <div className='accordion-content semana-content' style={{ padding: '10px' }}>
                              {renderDiasContent(diasSemanales, rutina.ID_Rutina, openState, toggleDia, `${key}_`)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  renderDiasContent(dias, rutina.ID_Rutina, openState, toggleDia)
                )}

                <div className="rutina-asignada" style={{ marginTop: 10 }}>
                  <strong>Usuarios:</strong>{' '}
                  {Array.isArray(rutina?.asignacionesUsuarios) && rutina.asignacionesUsuarios.length > 0
                    ? rutina.asignacionesUsuarios.map(u => `${u.nombre || ''} ${u.apellido || ''}`.trim()).join(', ')
                    : `${rutina?.alumno?.nombre || ''} ${rutina?.alumno?.apellido || ''}`.trim() || '—'}

                  <div>
                    <strong>Grupos:</strong>{' '}
                    {Array.isArray(rutina?.asignacionesGrupos) && rutina.asignacionesGrupos.length > 0
                      ? rutina.asignacionesGrupos.map(g => g.nombre).join(', ')
                      : '—'}
                  </div>

                  <div>
                    <strong>Por:</strong> {`${rutina?.entrenador?.nombre || ''} ${rutina?.entrenador?.apellido || ''}`.trim() || '—'}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <button className='rutina-ver-detalle-btn' onClick={() => navigate(`/entrenador/rutinas/${rutina.ID_Rutina}`)}>
                    Ver mas detalles
                  </button>
                </div>
              </div>
            );
          })
          }
        </div>

        <ConfirmationPopup
          isOpen={isPopupOpen}
          message="¿Estás seguro que deseas eliminar esta rutina?"
          onClose={closePopup}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
};

export default RutinasAsignadas;