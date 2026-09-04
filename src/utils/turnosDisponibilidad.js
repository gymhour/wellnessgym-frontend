const ACTIVE_STATES = new Set(['ACTIVO', 'ASISTIDO', 'AUSENTE']);
const DAY_INDEX = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeDay = (value) => String(value || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const calculateTurnosDisponibilidad = ({ clases = [], cuotas = [], turnos = [] }) => {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cuota = cuotas.find((item) => {
    if (!item?.fechaInicio || !item?.fechaFin) return item?.mes === currentMonth;
    const start = new Date(item.fechaInicio);
    const end = new Date(item.fechaFin);
    const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    return startUtc <= todayUtc && endUtc >= todayUtc;
  });
  if (!cuota) return null;

  const total = Number(cuota.planSesionesTotalesSnapshot ?? cuota.Plan?.sesionesTotales ?? 0);
  if (total <= 0) return null;

  const consuming = turnos.filter((turno) => Number(turno.ID_Cuota) === Number(cuota.ID_Cuota)
    && ACTIVE_STATES.has(turno.estado));
  const planBalance = Math.max(total - consuming.length, 0);
  const occupiedDays = new Set(consuming.map((turno) => {
    const date = new Date(turno.fecha);
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  }));
  const schedules = clases.flatMap((clase) => clase?.HorariosClase || []).filter((item) => item?.activo !== false);
  const end = cuota.fechaFin ? new Date(cuota.fechaFin) : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let freeBookableDays = 0;

  for (let dayUtc = todayUtc; dayUtc <= endUtc; dayUtc += DAY_MS) {
    const day = new Date(dayUtc);
    const key = `${day.getUTCFullYear()}-${day.getUTCMonth()}-${day.getUTCDate()}`;
    if (occupiedDays.has(key)) continue;
    const hasSchedule = schedules.some((schedule) => {
      if (DAY_INDEX[normalizeDay(schedule.diaSemana)] !== day.getUTCDay()) return false;
      if (dayUtc !== todayUtc) return true;
      const time = new Date(schedule.horaIni);
      return time.getUTCHours() * 60 + time.getUTCMinutes() > now.getHours() * 60 + now.getMinutes();
    });
    if (hasSchedule) freeBookableDays += 1;
  }

  return { disponibles: Math.min(planBalance, freeBookableDays), total };
};
