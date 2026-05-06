import { useEffect, useState, useMemo } from 'react';
import {
  fetchFacialRecords,
  fetchSectors,
  type FacialRecognitionRecord,
  type Sector,
} from '@/lib/api';
import { FileSearch, Filter } from 'lucide-react';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function FacialReportsPage() {
  const [records, setRecords] = useState<FacialRecognitionRecord[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recData, secData] = await Promise.all([
        fetchFacialRecords(500),
        fetchSectors(),
      ]);
      setRecords(recData.items);
      setSectors(secData);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const ts = new Date(r.timestamp);
      if (startDate && ts < new Date(startDate)) return false;
      if (endDate && ts > new Date(endDate + 'T23:59:59')) return false;
      if (selectedSector !== 'all' && r.sector_id !== Number(selectedSector)) return false;
      return true;
    });
  }, [records, startDate, endDate, selectedSector]);

  // Heatmap data: day of week x hour
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    filteredRecords.forEach((r) => {
      const d = new Date(r.timestamp);
      grid[d.getDay()][d.getHours()]++;
    });
    return grid;
  }, [filteredRecords]);

  // Max value for heatmap color scaling
  const maxHeatValue = useMemo(() => {
    let max = 0;
    heatmapData.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));
    return max || 1;
  }, [heatmapData]);

  // Sector comparison
  const sectorMetrics = useMemo(() => {
    const metrics: Record<number, { total: number; avgConf: number; entries: number; exits: number }> = {};
    filteredRecords.forEach((r) => {
      if (!metrics[r.sector_id]) {
        metrics[r.sector_id] = { total: 0, avgConf: 0, entries: 0, exits: 0 };
      }
      metrics[r.sector_id].total++;
      metrics[r.sector_id].avgConf += r.confidence;
      if (r.event_type === 'entry') metrics[r.sector_id].entries++;
      if (r.event_type === 'exit') metrics[r.sector_id].exits++;
    });
    return Object.entries(metrics)
      .map(([sectorId, m]) => ({
        sector: sectors.find((s) => s.id === Number(sectorId)),
        sectorId: Number(sectorId),
        total: m.total,
        avgConf: m.total > 0 ? (m.avgConf / m.total).toFixed(1) : '0',
        entries: m.entries,
        exits: m.exits,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, sectors]);

  function getHeatColor(value: number): string {
    if (value === 0) return 'bg-slate-800';
    const intensity = value / maxHeatValue;
    if (intensity < 0.25) return 'bg-blue-900/60';
    if (intensity < 0.5) return 'bg-blue-700/70';
    if (intensity < 0.75) return 'bg-blue-500/80';
    return 'bg-blue-400';
  }

  function getSectorName(sectorId: number): string {
    return sectors.find((s) => s.id === sectorId)?.name ?? `Setor #${sectorId}`;
  }

  function formatEventType(type: string): string {
    switch (type) {
      case 'entry': return 'Entrada';
      case 'exit': return 'Saída';
      case 'detection': return 'Detecção';
      default: return type;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Carregando relatórios...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSearch className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios Faciais</h1>
          <p className="text-sm text-slate-400">Análise detalhada de reconhecimento facial</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Setor</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos os Setores</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-4">
          Mapa de Calor - Atividade por Dia e Hora
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-slate-500">
                  {h % 3 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>
            {/* Grid */}
            {DAYS_OF_WEEK.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-xs text-slate-400 text-right">{day}</span>
                <div className="flex flex-1 gap-0.5">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className={`flex-1 h-6 rounded-sm ${getHeatColor(heatmapData[dayIdx][hour])} transition-colors`}
                      title={`${day} ${hour}h: ${heatmapData[dayIdx][hour]} detecções`}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-slate-500">Menos</span>
              <div className="w-4 h-3 rounded-sm bg-slate-800" />
              <div className="w-4 h-3 rounded-sm bg-blue-900/60" />
              <div className="w-4 h-3 rounded-sm bg-blue-700/70" />
              <div className="w-4 h-3 rounded-sm bg-blue-500/80" />
              <div className="w-4 h-3 rounded-sm bg-blue-400" />
              <span className="text-[10px] text-slate-500">Mais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Comparison */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Comparação entre Setores</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-[#0F172A]/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Setor</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Total</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Entradas</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Saídas</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Conf. Média</th>
            </tr>
          </thead>
          <tbody>
            {sectorMetrics.map((m) => (
              <tr key={m.sectorId} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {m.sector?.name ?? `Setor #${m.sectorId}`}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-300">{m.total}</td>
                <td className="px-4 py-3 text-sm text-right text-green-400">{m.entries}</td>
                <td className="px-4 py-3 text-sm text-right text-red-400">{m.exits}</td>
                <td className="px-4 py-3 text-sm text-right text-amber-400">{m.avgConf}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Events Table */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">
            Eventos Detalhados ({filteredRecords.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#1E293B]">
              <tr className="border-b border-slate-700 bg-[#0F172A]/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Pessoa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Setor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Confiança</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, 100).map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-2.5 text-sm text-white">{r.person_name}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{r.person_id}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-300">
                    {getSectorName(r.sector_id)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.event_type === 'entry'
                          ? 'bg-green-500/20 text-green-400'
                          : r.event_type === 'exit'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {formatEventType(r.event_type)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right text-slate-300">
                    {r.confidence.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-xs text-right text-slate-400">
                    {new Date(r.timestamp).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}