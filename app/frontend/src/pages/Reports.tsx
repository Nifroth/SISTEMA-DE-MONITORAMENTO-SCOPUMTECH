import { useEffect, useMemo, useState } from 'react';
import { fetchEvents, fetchZones, MonitoringEvent, MonitoringZone } from '@/lib/api';
import { FileBarChart, TrendingUp, Clock, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export default function ReportsPage() {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [eventsData, zonesData] = await Promise.all([
        fetchEvents(500),
        fetchZones(),
      ]);
      setEvents(eventsData.items);
      setZones(zonesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter events based on selected date range
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      const eventDate = new Date(e.timestamp);
      switch (dateFilter) {
        case 'today': {
          return eventDate.toDateString() === now.toDateString();
        }
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return eventDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return eventDate >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [events, dateFilter]);

  // Hourly distribution
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => {
    const hourEvents = filteredEvents.filter((e) => new Date(e.timestamp).getHours() === i);
    return {
      hour: `${i.toString().padStart(2, '0')}h`,
      total: hourEvents.length,
      entradas: hourEvents.filter((e) => e.event_type === 'entry').length,
      saidas: hourEvents.filter((e) => e.event_type === 'exit').length,
      adultos: hourEvents.filter((e) => e.person_type === 'adult').length,
      criancas: hourEvents.filter((e) => e.person_type === 'child').length,
    };
  });

  // Peak hours
  const peakHour = hourlyDistribution.reduce((max, curr) => curr.total > max.total ? curr : max, hourlyDistribution[0]);

  // Zone distribution
  const zoneDistribution = zones.map((zone) => {
    const zoneEvents = filteredEvents.filter((e) => e.zone_id === zone.id);
    return {
      name: zone.name,
      total: zoneEvents.length,
      entradas: zoneEvents.filter((e) => e.event_type === 'entry').length,
      saidas: zoneEvents.filter((e) => e.event_type === 'exit').length,
    };
  });

  // Summary stats
  const totalEvents = filteredEvents.length;
  const totalEntries = filteredEvents.filter((e) => e.event_type === 'entry').length;
  const totalExits = filteredEvents.filter((e) => e.event_type === 'exit').length;
  const avgConfidence = filteredEvents.length > 0 ? filteredEvents.reduce((sum, e) => sum + e.confidence, 0) / filteredEvents.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-slate-400 text-sm mt-1">Análise detalhada do fluxo de pessoas por horário e zona</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === filter
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#1E293B] text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {filter === 'today' ? 'Hoje' : filter === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <FileBarChart className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">Total de Eventos</span>
          </div>
          <p className="text-3xl font-bold">{totalEvents}</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">Taxa Entrada/Saída</span>
          </div>
          <p className="text-3xl font-bold">{totalExits > 0 ? (totalEntries / totalExits).toFixed(1) : '—'}x</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-slate-400">Horário de Pico</span>
          </div>
          <p className="text-3xl font-bold">{peakHour?.hour || '—'}</p>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-400">Confiança Média</span>
          </div>
          <p className="text-3xl font-bold">{(avgConfidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Hourly Distribution Chart */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Distribuição por Hora</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={hourlyDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} />
            <YAxis stroke="#94A3B8" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#F8FAFC' }}
            />
            <Area type="monotone" dataKey="entradas" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Entradas" />
            <Area type="monotone" dataKey="saidas" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} name="Saídas" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Adults vs Children */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Adultos vs Crianças por Hora</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#F8FAFC' }}
              />
              <Line type="monotone" dataKey="adultos" stroke="#3B82F6" strokeWidth={2} name="Adultos" dot={false} />
              <Line type="monotone" dataKey="criancas" stroke="#F59E0B" strokeWidth={2} name="Crianças" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Fluxo por Zona</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={zoneDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#F8FAFC' }}
              />
              <Bar dataKey="entradas" fill="#10B981" name="Entradas" radius={[0, 4, 4, 0]} />
              <Bar dataKey="saidas" fill="#EF4444" name="Saídas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}