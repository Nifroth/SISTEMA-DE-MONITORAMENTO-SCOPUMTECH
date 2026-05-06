import { useEffect, useState } from 'react';
import { fetchEvents, fetchZones, createZone, updateZone, deleteZone, MonitoringEvent, MonitoringZone } from '@/lib/api';
import { MapPin, Camera, Wifi, WifiOff, Users, ArrowUpRight, ArrowDownRight, Plus, Pencil, Trash2, X } from 'lucide-react';

type ZoneFormData = {
  name: string;
  zone_type: 'entrance' | 'exit' | 'internal';
  camera_id: string;
  status: 'active' | 'inactive';
  location: string;
};

const emptyForm: ZoneFormData = {
  name: '',
  zone_type: 'entrance',
  camera_id: '',
  status: 'active',
  location: '',
};

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function ZonesPage() {
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingZone, setEditingZone] = useState<MonitoringZone | null>(null);
  const [formData, setFormData] = useState<ZoneFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<MonitoringZone | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  let notifIdCounter = 0;

  function showNotification(message: string, type: 'success' | 'error') {
    const id = Date.now() + notifIdCounter++;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [zonesData, eventsData] = await Promise.all([
        fetchZones(),
        fetchEvents(500),
      ]);
      setZones(zonesData);
      setEvents(eventsData.items);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getZoneStats(zoneId: number) {
    const zoneEvents = events.filter((e) => e.zone_id === zoneId);
    return {
      total: zoneEvents.length,
      entries: zoneEvents.filter((e) => e.event_type === 'entry').length,
      exits: zoneEvents.filter((e) => e.event_type === 'exit').length,
      adults: zoneEvents.filter((e) => e.person_type === 'adult').length,
      children: zoneEvents.filter((e) => e.person_type === 'child').length,
      avgConfidence: zoneEvents.length > 0
        ? zoneEvents.reduce((sum, e) => sum + e.confidence, 0) / zoneEvents.length
        : 0,
      lastEvent: zoneEvents.length > 0 ? zoneEvents[0] : null,
    };
  }

  const zoneTypeLabels: Record<string, string> = {
    entrance: 'Entrada',
    exit: 'Saída',
    internal: 'Interna',
  };

  const zoneTypeColors: Record<string, string> = {
    entrance: 'bg-green-500/20 text-green-400',
    exit: 'bg-red-500/20 text-red-400',
    internal: 'bg-purple-500/20 text-purple-400',
  };

  // Modal handlers
  function openCreateModal() {
    setModalMode('create');
    setEditingZone(null);
    setFormData(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(zone: MonitoringZone) {
    setModalMode('edit');
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      zone_type: zone.zone_type,
      camera_id: zone.camera_id,
      status: zone.status,
      location: zone.location,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingZone(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (modalMode === 'create') {
        await createZone(formData);
        showNotification('Zona criada com sucesso!', 'success');
      } else if (editingZone) {
        await updateZone(editingZone.id, formData);
        showNotification('Zona atualizada com sucesso!', 'success');
      }
      closeModal();
      await loadData();
    } catch (error) {
      console.error('Error saving zone:', error);
      showNotification('Erro ao salvar zona. Tente novamente.', 'error');
    } finally {
      setFormLoading(false);
    }
  }

  // Delete handlers
  function openDeleteConfirm(zone: MonitoringZone) {
    setZoneToDelete(zone);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setZoneToDelete(null);
  }

  async function handleDelete() {
    if (!zoneToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteZone(zoneToDelete.id);
      showNotification('Zona excluída com sucesso!', 'success');
      closeDeleteConfirm();
      await loadData();
    } catch (error) {
      console.error('Error deleting zone:', error);
      showNotification('Erro ao excluir zona. Tente novamente.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
              notif.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {notif.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Zonas</h1>
          <p className="text-slate-400 text-sm mt-1">Configuração e status de câmeras e zonas de monitoramento</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Zona
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{zones.length}</p>
              <p className="text-xs text-slate-400">Total de Zonas</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{zones.filter((z) => z.status === 'active').length}</p>
              <p className="text-xs text-slate-400">Zonas Ativas</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{zones.filter((z) => z.status === 'inactive').length}</p>
              <p className="text-xs text-slate-400">Zonas Inativas</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-2xl font-bold">{zones.length}</p>
              <p className="text-xs text-slate-400">Câmeras Instaladas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {zones.map((zone) => {
          const stats = getZoneStats(zone.id);
          return (
            <div key={zone.id} className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{zone.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${zoneTypeColors[zone.zone_type]}`}>
                        {zoneTypeLabels[zone.zone_type]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{zone.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(zone)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
                      title="Editar zona"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(zone)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      title="Excluir zona"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                      zone.status === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        zone.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span className={`text-xs font-medium ${
                        zone.status === 'active' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {zone.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Camera Info */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-[#0F172A] rounded-lg">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{zone.camera_id}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0F172A] rounded-lg p-3 text-center">
                    <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                  <div className="bg-[#0F172A] rounded-lg p-3 text-center">
                    <ArrowUpRight className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-400">{stats.entries}</p>
                    <p className="text-xs text-slate-400">Entradas</p>
                  </div>
                  <div className="bg-[#0F172A] rounded-lg p-3 text-center">
                    <ArrowDownRight className="w-4 h-4 text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-400">{stats.exits}</p>
                    <p className="text-xs text-slate-400">Saídas</p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Adultos: {stats.adults} | Crianças: {stats.children}</span>
                  <span>Confiança: {(stats.avgConfidence * 100).toFixed(0)}%</span>
                </div>

                {stats.lastEvent && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Último evento: {new Date(stats.lastEvent.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {zones.length === 0 && (
        <div className="text-center py-12 bg-[#1E293B] rounded-xl border border-slate-700">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-lg">Nenhuma zona cadastrada</p>
          <p className="text-slate-500 text-sm mt-1">Clique em &quot;Nova Zona&quot; para criar a primeira zona de monitoramento.</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#1E293B] border border-slate-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold">
                {modalMode === 'create' ? 'Nova Zona' : 'Editar Zona'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Ex: Entrada Principal"
                />
              </div>

              {/* Zone Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de Zona</label>
                <select
                  value={formData.zone_type}
                  onChange={(e) => setFormData({ ...formData, zone_type: e.target.value as ZoneFormData['zone_type'] })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="entrance">Entrada</option>
                  <option value="exit">Saída</option>
                  <option value="internal">Interna</option>
                </select>
              </div>

              {/* Camera ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">ID da Câmera</label>
                <input
                  type="text"
                  required
                  value={formData.camera_id}
                  onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Ex: CAM-001"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ZoneFormData['status'] })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Localização</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Ex: Bloco A - Térreo"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {formLoading ? 'Salvando...' : modalMode === 'create' ? 'Criar Zona' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && zoneToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDeleteConfirm} />
          <div className="relative bg-[#1E293B] border border-slate-700 rounded-xl w-full max-w-sm mx-4 shadow-2xl">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold">Excluir Zona</h2>
              </div>
              <p className="text-slate-300 text-sm mb-1">
                Tem certeza que deseja excluir a zona:
              </p>
              <p className="text-white font-medium mb-4">&quot;{zoneToDelete.name}&quot;?</p>
              <p className="text-slate-400 text-xs mb-5">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}