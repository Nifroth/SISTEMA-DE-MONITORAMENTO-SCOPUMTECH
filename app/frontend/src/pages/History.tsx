import { useEffect, useState } from 'react';
import { fetchEvents, fetchZones, MonitoringEvent, MonitoringZone } from '@/lib/api';
import { History as HistoryIcon, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HistoryPage() {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const pageSize = 15;

  useEffect(() => {
    loadZones();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [page, filterType, filterPerson, filterZone]);

  async function loadZones() {
    try {
      const zonesData = await fetchZones();
      setZones(zonesData);
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const query: Record<string, any> = {};
      if (filterType !== 'all') query.event_type = filterType;
      if (filterPerson !== 'all') query.person_type = filterPerson;
      if (filterZone !== 'all') query.zone_id = parseInt(filterZone);

      const data = await fetchEvents(pageSize, page * pageSize, query);
      setEvents(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = ['ID', 'Zona', 'Tipo Evento', 'Tipo Pessoa', 'Data/Hora', 'Confiança'];
    const rows = events.map((e) => {
      const zone = zones.find((z) => z.id === e.zone_id);
      return [
        e.id,
        zone?.name || `Zona ${e.zone_id}`,
        e.event_type === 'entry' ? 'Entrada' : 'Saída',
        e.person_type === 'adult' ? 'Adulto' : 'Criança',
        new Date(e.timestamp).toLocaleString('pt-BR'),
        `${(e.confidence * 100).toFixed(0)}%`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-eventos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Eventos</h1>
          <p className="text-slate-400 text-sm mt-1">Registro completo de todas as detecções do sistema</p>
        </div>
        <Button
          onClick={exportCSV}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Tipo de Evento</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
              className="bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="entry">Entrada</option>
              <option value="exit">Saída</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Tipo de Pessoa</label>
            <select
              value={filterPerson}
              onChange={(e) => { setFilterPerson(e.target.value); setPage(0); }}
              className="bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="adult">Adulto</option>
              <option value="child">Criança</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Zona</label>
            <select
              value={filterZone}
              onChange={(e) => { setFilterZone(e.target.value); setPage(0); }}
              className="bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-[#0F172A]">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Zona</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Pessoa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Data/Hora</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Carregando...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Nenhum evento encontrado</td>
                </tr>
              ) : (
                events.map((event) => {
                  const zone = zones.find((z) => z.id === event.zone_id);
                  return (
                    <tr key={event.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-sm text-slate-300">#{event.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{zone?.name || `Zona ${event.zone_id}`}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          event.event_type === 'entry'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {event.event_type === 'entry' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          event.person_type === 'adult'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {event.person_type === 'adult' ? 'Adulto' : 'Criança'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${event.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{(event.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <span className="text-sm text-slate-400">
            Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} de {total} eventos
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-400">
              Página {page + 1} de {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}