import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck, TrendingDown, Users } from 'lucide-react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import apiService from '../../../services/apiService';
import './ChurnRiskPage.css';

const RISK_OPTIONS = [
  { value: '', label: 'Todos los riesgos' },
  { value: 'MEDIO_ALTO', label: 'Medio/alto' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BAJO', label: 'Bajo' },
];

const PAGE_SIZE = 20;
const DEFAULT_RISK_LEVEL = '';

const formatDate = value => {
  if (!value) return 'Sin asistencias';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin asistencias';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatNumber = value => (
  Number(value || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
);

const getRiskLabel = riskLevel => ({
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
}[riskLevel] || '-');

const getStudentName = user => (
  [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.email || 'Alumno sin nombre'
);

// Normaliza un teléfono argentino al formato que espera wa.me: "54 9" + (área + abonado).
// Contempla +54 / 0054, el código de país 54, el prefijo de larga distancia 0,
// el "9" de móvil y el "15" heredado que queda entre el área y el número.
const normalizeArWhatsapp = tel => {
  let d = String(tel ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);   // salida internacional (00)
  if (d.startsWith('54')) d = d.slice(2);   // código de país
  if (d.startsWith('9')) d = d.slice(1);    // prefijo de móvil (se re-agrega al final)
  if (d.startsWith('0')) d = d.slice(1);    // prefijo de larga distancia
  if (d.length > 10) {
    // Quita el "15" que queda entre el código de área (2, 3 o 4 dígitos) y el abonado.
    const m = d.match(/^(11|\d{3}|\d{4})15(\d+)$/);
    if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  }
  if (d.length !== 10) return '';            // no parece un número argentino válido
  if (d.startsWith('15')) return '';         // "15" suelto sin código de área: ambiguo, no se puede resolver
  return `549${d}`;
};

const buildWhatsappLink = tel => {
  const num = normalizeArWhatsapp(tel);
  return num ? `https://wa.me/${num}` : '';
};

const ChurnRiskPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', riskLevel: DEFAULT_RISK_LEVEL });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState({
    summary: null,
    pagination: { page: 1, totalPages: 1, total: 0 },
    data: [],
  });

  const loadRiskReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getChurnRisk({
        page,
        take: PAGE_SIZE,
        riskLevel: filters.riskLevel,
        search: filters.search,
      });
      setReport({
        summary: data?.summary || null,
        pagination: data?.pagination || { page: 1, totalPages: 1, total: 0 },
        data: Array.isArray(data?.data) ? data.data : [],
      });
    } catch (err) {
      setReport(prev => ({ ...prev, data: [] }));
      setError(err.message || 'No se pudo cargar el predictor de bajas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const cards = useMemo(() => ([
    {
      label: 'Alto riesgo',
      value: report.summary?.highRisk || 0,
      icon: <AlertTriangle size={20} />,
      tone: 'high',
    },
    {
      label: 'Riesgo medio',
      value: report.summary?.mediumRisk || 0,
      icon: <TrendingDown size={20} />,
      tone: 'medium',
    },
    {
      label: 'Bajo riesgo',
      value: report.summary?.lowRisk || 0,
      icon: <ShieldCheck size={20} />,
      tone: 'low',
    },
    {
      label: 'Alumnos evaluados',
      value: report.summary?.evaluatedUsers || 0,
      icon: <Users size={20} />,
      tone: 'neutral',
    },
  ]), [report.summary]);

  const applyFilters = event => {
    event.preventDefault();
    setPage(1);
    setFilters(prev => ({ ...prev, search: searchInput.trim() }));
  };

  const changeRiskFilter = event => {
    setPage(1);
    setFilters(prev => ({ ...prev, riskLevel: event.target.value }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setPage(1);
    setFilters({ search: '', riskLevel: DEFAULT_RISK_LEVEL });
  };

  const totalPages = Math.max(1, Number(report.pagination?.totalPages || 1));

  return (
    <div className="page-layout">
      <SidebarMenu isAdmin={true} />
      {loading && <LoaderFullScreen />}

      <main className="content-layout churn-risk-page">
        <div className="churn-risk-header">
          <div>
            <h2>Predictor de bajas</h2>
            <p>Ranking de alumnos activos con señales de caída de asistencia.</p>
          </div>
        </div>

        <section className="churn-risk-cards">
          {cards.map(card => (
            <article className={`churn-risk-card ${card.tone}`} key={card.label}>
              <div className="churn-risk-card-icon">{card.icon}</div>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="churn-risk-filters">
          <form onSubmit={applyFilters} className="churn-risk-search">
            <label htmlFor="churn-search">Buscar alumno</label>
            <div className="churn-risk-search-row">
              <Search size={18} />
              <input
                id="churn-search"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Nombre, apellido o DNI"
              />
              <button type="submit">Buscar</button>
            </div>
          </form>

          <div className="churn-risk-filter-field">
            <label htmlFor="risk-level">Riesgo</label>
            <select id="risk-level" value={filters.riskLevel} onChange={changeRiskFilter}>
              {RISK_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button type="button" className="churn-risk-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </section>

        {error ? (
          <div className="churn-risk-state">
            <h3>Error de carga</h3>
            <p>{error}</p>
          </div>
        ) : report.data.length === 0 ? (
          <div className="churn-risk-state">
            <h3>No hay alumnos para mostrar</h3>
            <p>No se encontraron resultados con los filtros seleccionados.</p>
          </div>
        ) : (
          <>
            <div className="churn-risk-table-wrapper">
              <table className="churn-risk-table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Plan</th>
                    <th>Riesgo</th>
                    <th>Score</th>
                    <th>Última asistencia</th>
                    <th>Prom. reciente</th>
                    <th>Prom. base</th>
                    <th>Consistencia</th>
                    <th>Motivo principal</th>
                    <th>Contactar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map(item => {
                    const waLink = buildWhatsappLink(item.user?.tel);
                    return (
                    <tr key={item.user?.id}>
                      <td data-label="Alumno">
                        <div className="churn-risk-user">
                          <strong>{getStudentName(item.user)}</strong>
                          <span>DNI {item.user?.dni || '-'}</span>
                        </div>
                      </td>
                      <td data-label="Plan">{item.plan?.nombre || '-'}</td>
                      <td data-label="Riesgo">
                        <span className={`churn-risk-badge ${String(item.riskLevel || '').toLowerCase()}`}>
                          {getRiskLabel(item.riskLevel)}
                        </span>
                      </td>
                      <td data-label="Score">
                        <div className="churn-risk-score">
                          <span>{item.riskScore}</span>
                          <div className="churn-risk-score-track">
                            <div style={{ width: `${Math.min(100, Math.max(0, item.riskScore || 0))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Última asistencia">{formatDate(item.lastAttendanceAt)}</td>
                      <td data-label="Prom. reciente">{formatNumber(item.metrics?.recentWeeklyAverage)} / sem.</td>
                      <td data-label="Prom. base">{formatNumber(item.metrics?.baselineWeeklyAverage)} / sem.</td>
                      <td data-label="Consistencia">{item.metrics?.activeWeeksLast4 || 0}/4 sem.</td>
                      <td data-label="Motivo">{item.mainReason}</td>
                      <td data-label="Contactar">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsapp-btn-table"
                            title={`Enviar WhatsApp a ${getStudentName(item.user)}`}
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
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="churn-risk-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                Siguiente
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ChurnRiskPage;
