import { useEffect, useState, useCallback } from 'react';
import {
  fetchFacialRecords,
  fetchSectors,
  fetchGroups,
  createFacialRecord,
  deleteFacialRecord,
  type FacialRecognitionRecord,
  type Sector,
  type EnvironmentGroup,
} from '@/lib/api';
import { ScanFace, Users, Target, Activity, Plus, Trash2, X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B'];

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

interface NewRecordForm {
  person_name: string;
  person_id: string;
  sector_id: number;
  group_id: number;
  confidence: number;
  event_type: 'entry' | 'exit' | 'detection';
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  detection: 'Detecção',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  entry: 'bg-green-500/20 text-green-400',
  exit: 'bg-red-500/20 text-red-400',
  detection: 'bg-amber-500/20 text-amber-400',
};

export default function FacialRecognitionPage() {
  const [records, setRecords] = useState<FacialRecognitionRecord[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [groups, setGroups] = useState<EnvironmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [form, setForm] = useState<NewRecordForm>({
    person_name: '',
    person_id: '',
    sector_id: 0,
    group_id: 0,
    confidence: 85,
    event_type: 'entry',
  });

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recData, secData, grpData] = await Promise.all([
        fetchFacialRecords(500),
        fetchSectors(),
        fetchGroups(),
      ]);
      setRecords(recData.items);
      setSectors(secData);
      setGroups(grpData);
    } catch (err) {
      console.error('Error loading facial recognition data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.person_name.trim() || !form.person_id.trim()) {
      showToast('Preencha nome e ID da pessoa.', 'error');
      return;
    }
    if (form.sector_id === 0) {
      showToast('Selecione um setor.', 'error');
      return;
    }
    if (form.group_id === 0) {
      showToast('Selecione um grupo.', 'error');
      return;
    }
    setFormSubmitting(true);
    try {
      await createFacialRecord({
        person_name: form.person_name.trim(),
        person_id: form.person_id.trim(),
        sector_id: form.sector_id,
        group_id: form.group_id,
        confidence: form.confidence,
        event_type: form.event_type,
        timestamp: new Date().toISOString(),
      });
      showToast('Registro criado com sucesso!', 'success');
      setShowCreateModal(false);
      setForm({
        person_name: '',
        person_id: '',
        sector_id: 0,
        group_id: 0,
        confidence: 85,
        event_type: 'entry',
      });
      await loadData();
    } catch (err) {
      console.error('Error creating record:', err);
      showToast('Erro ao criar registro.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteFacialRecord(id);
      showToast('Registro excluído com sucesso!', 'success');
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('Erro ao excluir registro.', 'error');
    }
  }

  function getSectorName(sectorId: number): string {
    const sector = sectors.find((s) => s.id === sectorId);
    return sector?.name ?? `Setor #${sectorId}`;
  }

  // Stats
  const totalRecognitions = records.length;
  const uniquePersons = new Set(records.map((r) => r.person_id)).size;
  const avgConfidence =
    records.length > 0
      ? (records.reduce((sum, r) => sum + r.confidence, 0) / records.length).toFixed(1)
      : '0';
  const activeSectors = sectors.filter((s) => s.status === 'active').length;

  // Hourly distribution
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}h`,
    count: records.filter((r) => new Date(r.timestamp).getHours() === i).length,
  }));

  // Event type distribution
  const eventTypeCounts = records.reduce(
    (acc, r) => {
      acc[r.event_type] = (acc[r.event_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const pieData = [
    { name: 'Entrada', value: eventTypeCounts['entry'] || 0 },
    { name: 'Saída', value: eventTypeCounts['exit'] || 0 },
    { name: 'Detecção', value: eventTypeCounts['detection'] || 0 },
  ];

  // Top sectors ranking
  const sectorCounts = records.reduce(
    (acc, r) => {
      acc[r.sector_id] = (acc[r.sector_id] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );
  const topSectors = Object.entries(sectorCounts)
    .map(([sectorId, count]) => ({
      sector: sectors.find((s) => s.id === Number(sectorId)),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Carregando dados de reconhecimento facial...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${
              toast.type === 'success'
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScanFace className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Reconhecimento Facial</h1>
            <p className="text-sm text-slate-400">Painel analítico de detecções faciais</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ScanFace className="w-5 h-5" />}
          label="Total de Reconhecimentos"
          value={totalRecognitions.toString()}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Pessoas Únicas"
          value={uniquePersons.toString()}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Confiança Média"
          value={`${avgConfidence}%`}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Setores Ativos"
          value={activeSectors.toString()}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Reconhecimentos por Hora
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Distribuição por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Sectors Table */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">
            Ranking de Setores por Reconhecimentos
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-[#0F172A]/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                Setor
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                Localização
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                Reconhecimentos
              </th>
            </tr>
          </thead>
          <tbody>
            {topSectors.map((item, idx) => (
              <tr
                key={item.sector?.id ?? idx}
                className="border-b border-slate-700/50 hover:bg-slate-700/20"
              >
                <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {item.sector?.name ?? `Setor #${Object.keys(sectorCounts)[idx]}`}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {item.sector?.location ?? '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-blue-400 font-semibold">
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Records Table */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">
            Registros Recentes ({records.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-[#0F172A]/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  ID Pessoa
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Setor
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Tipo
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Confiança
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Data/Hora
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 50).map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {record.person_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                    {record.person_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {getSectorName(record.sector_id)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${EVENT_TYPE_COLORS[record.event_type] || 'bg-slate-500/20 text-slate-400'}`}
                    >
                      {EVENT_TYPE_LABELS[record.event_type] || record.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400 font-semibold">
                    {record.confidence}%
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {new Date(record.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {deleteConfirmId === record.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(record.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-[#1E293B] border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Novo Registro Facial</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nome da Pessoa
                </label>
                <input
                  type="text"
                  value={form.person_name}
                  onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  ID da Pessoa
                </label>
                <input
                  type="text"
                  value={form.person_id}
                  onChange={(e) => setForm({ ...form, person_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ex: PID-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Setor
                </label>
                <select
                  value={form.sector_id}
                  onChange={(e) => setForm({ ...form, sector_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Selecione um setor</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Grupo
                </label>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Selecione um grupo</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Confiança (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.confidence}
                  onChange={(e) =>
                    setForm({ ...form, confidence: Math.min(100, Math.max(0, Number(e.target.value))) })
                  }
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={form.event_type}
                  onChange={(e) =>
                    setForm({ ...form, event_type: e.target.value as 'entry' | 'exit' | 'detection' })
                  }
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="entry">Entrada</option>
                  <option value="exit">Saída</option>
                  <option value="detection">Detecção</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={formSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {formSubmitting ? 'Salvando...' : 'Criar Registro'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
        <span className="text-xs text-slate-400 uppercase font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}