import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck, TrendingDown, Users } from 'lucide-react';
import SidebarMenu from '../../../Components/SidebarMenu/SidebarMenu';
import LoaderFullScreen from '../../../Components/utils/LoaderFullScreen/LoaderFullScreen';
import apiService from '../../../services/apiService';
import './ChurnRiskPage.css';

const RISK_OPTIONS = [
  { value: 'MEDIO_ALTO', label: 'Medio/alto' },
  { value: '', label: 'Todos los riesgos' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BAJO', label: 'Bajo' },
];

const PAGE_SIZE = 20;
const DEFAULT_RISK_LEVEL = 'MEDIO_ALTO';

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
                  </tr>
                </thead>
                <tbody>
                  {report.data.map(item => (
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
                    </tr>
                  ))}
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
