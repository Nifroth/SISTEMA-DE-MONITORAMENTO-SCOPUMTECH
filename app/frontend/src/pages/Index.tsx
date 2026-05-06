import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEvents, fetchZones, MonitoringEvent, MonitoringZone } from '@/lib/api';
import { Users, ArrowUpRight, ArrowDownRight, UserCheck, Baby, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [eventsData, zonesData] = await Promise.all([
        fetchEvents(500),
        fetchZones(),
      ]);
      setEvents(eventsData.items);
      setZones(zonesData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadData();
    }, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData]);

  const totalEntries = events.filter((e) => e.event_type === 'entry').length;
  const totalExits = events.filter((e) => e.event_type === 'exit').length;
  const currentOccupancy = totalEntries - totalExits;
  const totalAdults = events.filter((e) => e.person_type === 'adult').length;
  const totalChildren = events.filter((e) => e.person_type === 'child').length;
  const activeZones = zones.filter((z) => z.status === 'active').length;

  // Hourly flow data
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourEvents = events.filter((e) => {
      const hour = new Date(e.timestamp).getHours();
      return hour === i;
    });
    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      entradas: hourEvents.filter((e) => e.event_type === 'entry').length,
      saidas: hourEvents.filter((e) => e.event_type === 'exit').length,
    };
  }).filter((d) => d.entradas > 0 || d.saidas > 0);

  // Person type distribution
  const personTypeData = [
    { name: 'Adultos', value: totalAdults, color: '#3B82F6' },
    { name: 'Crianças', value: totalChildren, color: '#F59E0B' },
  ];

  const stats = [
    { label: 'Ocupação Atual', value: currentOccupancy, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Entradas', value: totalEntries, icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Saídas', value: totalExits, icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Adultos', value: totalAdults, icon: UserCheck, color: 'text-blue-300', bg: 'bg-blue-400/20' },
    { label: 'Crianças', value: totalChildren, icon: Baby, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Zonas Ativas', value: activeZones, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Monitoramento</h1>
          <p className="text-slate-400 text-sm mt-1">Visão geral em tempo real do sistema de contagem de pessoas</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-slate-500 text-xs">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-xs font-medium">AO VIVO</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Flow Chart */}
        <div className="lg:col-span-2 bg-[#1E293B] rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Fluxo por Hora</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#F8FAFC' }}
              />
              <Bar dataKey="entradas" fill="#10B981" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#EF4444" name="Saídas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Person Type Distribution */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Distribuição por Tipo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={personTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {personTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {personTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Status */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Status das Zonas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => {
            const zoneEvents = events.filter((e) => e.zone_id === zone.id);
            const zoneEntries = zoneEvents.filter((e) => e.event_type === 'entry').length;
            const zoneExits = zoneEvents.filter((e) => e.event_type === 'exit').length;
            return (
              <div key={zone.id} className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{zone.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    zone.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {zone.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{zone.camera_id} • {zone.location}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">↑ {zoneEntries} entradas</span>
                  <span className="text-red-400">↓ {zoneExits} saídas</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}