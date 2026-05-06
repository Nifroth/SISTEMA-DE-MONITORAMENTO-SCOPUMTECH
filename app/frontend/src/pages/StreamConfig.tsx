import { useEffect, useState } from 'react';
import { fetchStreams, fetchZones, createStream, deleteStream, CameraStream, MonitoringZone } from '@/lib/api';
import { Plus, Trash2, Settings, Radio, Wifi, WifiOff, AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StreamConfigPage() {
  const [streams, setStreams] = useState<CameraStream[]>([]);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    zone_id: 0,
    stream_url: '',
    protocol: 'rtsp' as 'rtsp' | 'rtmp',
    hls_url: '',
    status: 'offline' as 'online' | 'offline' | 'error',
    resolution: '1920x1080',
    fps: 30,
    bitrate: '4Mbps',
    last_connected: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [streamsData, zonesData] = await Promise.all([
        fetchStreams(),
        fetchZones(),
      ]);
      setStreams(streamsData);
      setZones(zonesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.zone_id || !formData.stream_url) return;

    try {
      // Auto-detect protocol from URL
      const protocol = formData.stream_url.startsWith('rtmp') ? 'rtmp' : 'rtsp';
      const newStream = await createStream({
        ...formData,
        protocol,
        last_connected: new Date().toISOString(),
      });
      setStreams((prev) => [...prev, newStream]);
      setShowForm(false);
      setFormData({
        zone_id: 0,
        stream_url: '',
        protocol: 'rtsp',
        hls_url: '',
        status: 'offline',
        resolution: '1920x1080',
        fps: 30,
        bitrate: '4Mbps',
        last_connected: '',
      });
    } catch (error) {
      console.error('Error creating stream:', error);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteStream(id);
      setStreams((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting stream:', error);
    }
  }

  function getZoneName(zoneId: number) {
    return zones.find((z) => z.id === zoneId)?.name || `Zona ${zoneId}`;
  }

  const statusConfig = {
    online: { icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Online' },
    offline: { icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Offline' },
    error: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Erro' },
  };

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
          <h1 className="text-2xl font-bold">Configuração de Streams</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie conexões RTSP e RTMP das câmeras de monitoramento</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Stream
        </Button>
      </div>

      {/* Protocol Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">RTSP</h3>
              <p className="text-xs text-slate-400">Real Time Streaming Protocol</p>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Protocolo padrão para câmeras IP. Suporta baixa latência e controle bidirecional.
            Formato: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">rtsp://ip:porta/stream</code>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400">Streams RTSP:</span>
            <span className="text-sm font-bold text-blue-400">{streams.filter((s) => s.protocol === 'rtsp').length}</span>
          </div>
        </div>

        <div className="bg-[#1E293B] rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Radio className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">RTMP</h3>
              <p className="text-xs text-slate-400">Real Time Messaging Protocol</p>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Protocolo para streaming ao vivo. Ideal para câmeras com push streaming.
            Formato: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">rtmp://ip:porta/live/canal</code>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400">Streams RTMP:</span>
            <span className="text-sm font-bold text-purple-400">{streams.filter((s) => s.protocol === 'rtmp').length}</span>
          </div>
        </div>
      </div>

      {/* Add Stream Form */}
      {showForm && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Adicionar Novo Stream</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Zona de Monitoramento</label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: parseInt(e.target.value) })}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value={0}>Selecione uma zona...</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name} - {zone.location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">URL do Stream (RTSP/RTMP)</label>
                <input
                  type="text"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">URL HLS (Transcodificado)</label>
                <input
                  type="text"
                  value={formData.hls_url}
                  onChange={(e) => setFormData({ ...formData, hls_url: e.target.value })}
                  placeholder="http://media-server/hls/stream.m3u8 (opcional)"
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Resolução</label>
                <select
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="640x480">640x480 (SD)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">FPS</label>
                <input
                  type="number"
                  value={formData.fps}
                  onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Bitrate</label>
                <select
                  value={formData.bitrate}
                  onChange={(e) => setFormData({ ...formData, bitrate: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="1Mbps">1 Mbps</option>
                  <option value="2Mbps">2 Mbps</option>
                  <option value="4Mbps">4 Mbps</option>
                  <option value="8Mbps">8 Mbps</option>
                  <option value="16Mbps">16 Mbps</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                <Save className="w-4 h-4 mr-2" />
                Salvar Stream
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Streams List */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-semibold">Streams Configurados ({streams.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-[#0F172A]">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Zona</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Protocolo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">URL do Stream</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Resolução</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Última Conexão</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {streams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Nenhum stream configurado. Clique em &quot;Novo Stream&quot; para adicionar.
                  </td>
                </tr>
              ) : (
                streams.map((stream) => {
                  const status = statusConfig[stream.status] || statusConfig.error;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={stream.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-sm text-slate-300">{getZoneName(stream.zone_id)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-1 rounded border ${
                          stream.protocol === 'rtsp'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {stream.protocol.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono text-xs max-w-[200px] truncate">
                        {stream.stream_url}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {stream.resolution} • {stream.fps}fps
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{status.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {stream.last_connected ? new Date(stream.last_connected).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(stream.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Info */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-3">Arquitetura de Streaming</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
            <h4 className="text-sm font-medium text-blue-400 mb-2">1. Câmera IP</h4>
            <p className="text-xs text-slate-400">
              Câmera envia stream via RTSP ou RTMP para o servidor de mídia
            </p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
            <h4 className="text-sm font-medium text-purple-400 mb-2">2. Media Server</h4>
            <p className="text-xs text-slate-400">
              FFmpeg/Nginx-RTMP transcodifica para HLS/DASH compatível com navegadores
            </p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
            <h4 className="text-sm font-medium text-green-400 mb-2">3. Player Web</h4>
            <p className="text-xs text-slate-400">
              hls.js reproduz o stream transcodificado no navegador em tempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}