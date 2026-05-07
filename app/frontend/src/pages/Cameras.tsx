import { useEffect, useState } from 'react';
import {
  fetchStreams, fetchZones, createStream, updateStream, deleteStream,
  CameraStream, MonitoringZone, MediaServerConfig,
  generateHlsUrl, generateWebRtcUrl,
  saveMediaServerConfig, loadMediaServerConfig, getDefaultMediaServerConfig, convertStreamDirect, autoOnboardCamera,
} from '@/lib/api';
import {
  Plus, Trash2, Edit2, Save, X, Camera, Wifi, WifiOff, AlertTriangle,
  Radio, Eye, Settings2, Video, MonitorPlay, Signal, Server, ChevronDown, ChevronUp,
  Copy, Check, Zap, Info, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreamPlayer, { StreamType } from '@/components/stream/StreamPlayer';

interface CameraFormData {
  zone_id: number;
  stream_url: string;
  protocol: 'rtsp' | 'rtmp';
  hls_url: string;
  stream_type: StreamType;
  status: 'online' | 'offline' | 'error';
  resolution: string;
  fps: number;
  bitrate: string;
  camera_name: string;
  camera_brand: string;
  camera_model: string;
  ip_address: string;
  port: number;
  username: string;
  password: string;
  channel: number;
}

const defaultFormData: CameraFormData = {
  zone_id: 0,
  stream_url: '',
  protocol: 'rtsp',
  hls_url: '',
  stream_type: 'auto',
  status: 'offline',
  resolution: '1920x1080',
  fps: 30,
  bitrate: '4Mbps',
  camera_name: '',
  camera_brand: '',
  camera_model: '',
  ip_address: '',
  port: 554,
  username: 'admin',
  password: '',
  channel: 1,
};

export default function CamerasPage() {
  const [streams, setStreams] = useState<CameraStream[]>([]);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CameraFormData>(defaultFormData);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'live'>('list');
  const [selectedStream, setSelectedStream] = useState<CameraStream | null>(null);
  const [streamTypes, setStreamTypes] = useState<Record<number, StreamType>>({});

  // Media Server Config State
  const [showMediaConfig, setShowMediaConfig] = useState(false);
  const [mediaConfig, setMediaConfig] = useState<MediaServerConfig>(getDefaultMediaServerConfig());
  const [mediaConfigSaved, setMediaConfigSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [useWebRtc, setUseWebRtc] = useState(false);
  const [autoRegisterOnSave, setAutoRegisterOnSave] = useState(true);

  useEffect(() => {
    const saved = loadMediaServerConfig();
    if (saved) setMediaConfig(saved);
  }, []);

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

  function handleSaveMediaConfig() {
    saveMediaServerConfig(mediaConfig);
    setMediaConfigSaved(true);
    setTimeout(() => setMediaConfigSaved(false), 2000);
  }

  async function handleTestMediaConnection() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const apiUrl = `http://${new URL(mediaConfig.serverUrl).hostname}:${mediaConfig.apiPort}/v3/config/global/get`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      setTestResult(response.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTestingConnection(false);
    }
  }

  function handleConvertRtsp() {
    const rtspUrl = generateStreamUrl() || formData.stream_url;
    if (!rtspUrl) return;

    if (useWebRtc) {
      const webrtcUrl = generateWebRtcUrl(rtspUrl, mediaConfig);
      setFormData((prev) => ({ ...prev, hls_url: webrtcUrl, stream_type: 'webrtc' as StreamType }));
    } else {
      const hlsUrl = generateHlsUrl(rtspUrl, mediaConfig);
      setFormData((prev) => ({ ...prev, hls_url: hlsUrl, stream_type: 'hls' as StreamType }));
    }
  }

  async function resolveBrowserStreamUrl(streamUrl: string): Promise<{ browserUrl: string; streamType: StreamType }> {
    if (formData.hls_url.trim()) {
      return { browserUrl: formData.hls_url.trim(), streamType: formData.stream_type };
    }

    if (!streamUrl.toLowerCase().startsWith('rtsp://') || !autoRegisterOnSave) {
      return { browserUrl: '', streamType: formData.stream_type };
    }

    try {
      const converted = await convertStreamDirect(streamUrl, mediaConfig);
      if (useWebRtc && converted.webrtc_url) {
        return { browserUrl: converted.webrtc_url, streamType: 'iframe' };
      }
      if (converted.hls_url) {
        return { browserUrl: converted.hls_url, streamType: 'hls' };
      }
    } catch (error) {
      console.warn('Auto-registration on MediaMTX failed, keeping manual URL flow:', error);
    }

    return { browserUrl: '', streamType: formData.stream_type };
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function generateStreamUrl(): string {
    const { protocol, ip_address, port, username, password, channel } = formData;
    if (!ip_address) return '';

    if (protocol === 'rtsp') {
      const auth = username && password ? `${username}:${password}@` : username ? `${username}@` : '';
      return `rtsp://${auth}${ip_address}:${port}/stream${channel}`;
    } else {
      return `rtmp://${ip_address}:${port || 1935}/live/channel${channel}`;
    }
  }

  function handleProtocolChange(protocol: 'rtsp' | 'rtmp') {
    const port = protocol === 'rtsp' ? 554 : 1935;
    setFormData((prev) => ({ ...prev, protocol, port }));
  }

  function handleIpChange(ip: string) {
    setFormData((prev) => {
      const updated = { ...prev, ip_address: ip };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.zone_id) return;

    const streamUrl = formData.stream_url || generateStreamUrl();
    if (!streamUrl && !formData.hls_url) return;

    try {
      if (!editingId && autoRegisterOnSave && formData.protocol === 'rtsp' && formData.ip_address && formData.username) {
        try {
          const onboarded = await autoOnboardCamera({
            zone_id: formData.zone_id,
            camera_ip: formData.ip_address,
            camera_port: formData.port || 554,
            username: formData.username,
            password: formData.password,
            channel: formData.channel || 1,
            vendor_hint: formData.camera_brand || undefined,
            stream_name: formData.camera_name || undefined,
            media_server_url: mediaConfig.serverUrl,
            hls_port: mediaConfig.hlsPort,
            webrtc_port: mediaConfig.webrtcPort,
            resolution: formData.resolution,
            fps: formData.fps,
            bitrate: formData.bitrate,
          });
          setStreams((prev) => [...prev, onboarded]);
          const resolvedType: StreamType = useWebRtc ? 'iframe' : 'hls';
          setStreamTypes((prev) => ({ ...prev, [onboarded.id]: resolvedType }));
          resetForm();
          return;
        } catch (onboardError) {
          console.warn('Auto-onboard failed, using manual save fallback:', onboardError);
        }
      }

      const { browserUrl, streamType } = await resolveBrowserStreamUrl(streamUrl);
      const finalBrowserUrl = formData.hls_url.trim() || browserUrl;
      if (editingId) {
        const updated = await updateStream(editingId, {
          zone_id: formData.zone_id,
          stream_url: streamUrl,
          protocol: formData.protocol,
          hls_url: finalBrowserUrl,
          status: finalBrowserUrl ? 'online' : formData.status,
          resolution: formData.resolution,
          fps: formData.fps,
          bitrate: formData.bitrate,
          last_connected: new Date().toISOString(),
        });
        setStreams((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        setStreamTypes((prev) => ({ ...prev, [editingId]: streamType }));
      } else {
        const newStream = await createStream({
          zone_id: formData.zone_id,
          stream_url: streamUrl,
          protocol: formData.protocol,
          hls_url: finalBrowserUrl,
          status: finalBrowserUrl ? 'online' : formData.status,
          resolution: formData.resolution,
          fps: formData.fps,
          bitrate: formData.bitrate,
          last_connected: new Date().toISOString(),
        });
        setStreams((prev) => [...prev, newStream]);
        setStreamTypes((prev) => ({ ...prev, [newStream.id]: streamType }));
      }
      resetForm();
    } catch (error) {
      console.error('Error saving stream:', error);
      alert('Não foi possível cadastrar a câmera. Verifique zona, URL e conexão com backend.');
    }
  }

  function resetForm() {
    setFormData(defaultFormData);
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(stream: CameraStream) {
    const urlParts = stream.stream_url.match(/(?:rtsp|rtmp):\/\/(?:([^:@]+)(?::([^@]+))?@)?([^:/]+):?(\d+)?/);
    setFormData({
      zone_id: stream.zone_id,
      stream_url: stream.stream_url,
      protocol: stream.protocol,
      hls_url: stream.hls_url || '',
      stream_type: streamTypes[stream.id] || 'auto',
      status: stream.status,
      resolution: stream.resolution || '1920x1080',
      fps: stream.fps || 30,
      bitrate: stream.bitrate || '4Mbps',
      camera_name: '',
      camera_brand: '',
      camera_model: '',
      ip_address: urlParts?.[3] || '',
      port: parseInt(urlParts?.[4] || (stream.protocol === 'rtsp' ? '554' : '1935')),
      username: urlParts?.[1] || '',
      password: urlParts?.[2] || '',
      channel: 1,
    });
    setEditingId(stream.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    try {
      await deleteStream(id);
      setStreams((prev) => prev.filter((s) => s.id !== id));
      setStreamTypes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (error) {
      console.error('Error deleting stream:', error);
    }
  }

  function getZoneName(zoneId: number) {
    return zones.find((z) => z.id === zoneId)?.name || `Zona ${zoneId}`;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cadastro de Câmeras</h1>
          <p className="text-slate-400 text-sm mt-1">Cadastre RTSP original e URL de visualização web sem sobrescrever links públicos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1E293B] rounded-lg border border-slate-700 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('live')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'live' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Ao Vivo
            </button>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData(defaultFormData); }}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Câmera
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Camera className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streams.length}</p>
              <p className="text-xs text-slate-400">Total Câmeras</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Wifi className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streams.filter((s) => s.status === 'online').length}</p>
              <p className="text-xs text-slate-400">Online</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <WifiOff className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streams.filter((s) => s.status === 'offline').length}</p>
              <p className="text-xs text-slate-400">Offline</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streams.filter((s) => s.status === 'error').length}</p>
              <p className="text-xs text-slate-400">Com Erro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Media Server Configuration */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowMediaConfig(!showMediaConfig)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold">Servidor de Mídia (RTSP → HLS/WebRTC)</h3>
              <p className="text-xs text-slate-400">Configure o servidor de mídia para converter streams RTSP</p>
            </div>
          </div>
          {showMediaConfig ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showMediaConfig && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">URL do Servidor</label>
                <input
                  type="text"
                  value={mediaConfig.serverUrl}
                  onChange={(e) => setMediaConfig({ ...mediaConfig, serverUrl: e.target.value })}
                  placeholder="http://localhost:9997"
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Servidor</label>
                <select
                  value={mediaConfig.serverType}
                  onChange={(e) => setMediaConfig({ ...mediaConfig, serverType: e.target.value as MediaServerConfig['serverType'] })}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="mediamtx">MediaMTX</option>
                  <option value="go2rtc">go2rtc</option>
                  <option value="srs">SRS</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Porta HLS</label>
                  <input
                    type="number"
                    value={mediaConfig.hlsPort}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, hlsPort: parseInt(e.target.value) || 8888 })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-2 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">WebRTC</label>
                  <input
                    type="number"
                    value={mediaConfig.webrtcPort}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, webrtcPort: parseInt(e.target.value) || 8889 })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-2 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">API</label>
                  <input
                    type="number"
                    value={mediaConfig.apiPort}
                    onChange={(e) => setMediaConfig({ ...mediaConfig, apiPort: parseInt(e.target.value) || 9997 })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-2 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig.hlsEnabled}
                  onChange={(e) => setMediaConfig({ ...mediaConfig, hlsEnabled: e.target.checked })}
                  className="rounded border-slate-600 bg-[#0F172A] text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300">HLS Habilitado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig.webrtcEnabled}
                  onChange={(e) => setMediaConfig({ ...mediaConfig, webrtcEnabled: e.target.checked })}
                  className="rounded border-slate-600 bg-[#0F172A] text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300">WebRTC Habilitado</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveMediaConfig}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                size="sm"
              >
                {mediaConfigSaved ? <Check className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                {mediaConfigSaved ? 'Salvo!' : 'Salvar Configuração'}
              </Button>
              <Button
                onClick={handleTestMediaConnection}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={testingConnection}
              >
                <Zap className="w-4 h-4 mr-1" />
                {testingConnection ? 'Testando...' : 'Testar Conexão'}
              </Button>
              {testResult === 'success' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Conectado com sucesso
                </span>
              )}
              {testResult === 'error' && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" /> Falha na conexão
                </span>
              )}
            </div>

            {/* Setup Guide */}
            <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    Para converter RTSP em HLS/WebRTC, você precisa de um servidor de mídia como <strong className="text-cyan-400">MediaMTX</strong> rodando na sua rede local.
                  </p>
                  <div className="bg-[#1E293B] rounded p-3 font-mono text-[11px] text-slate-400 space-y-1">
                    <p className="text-slate-500"># Instalação rápida do MediaMTX:</p>
                    <p>docker run --rm -it --network=host bluenviron/mediamtx:latest</p>
                    <p className="text-slate-500 mt-2"># Ou baixe de:</p>
                    <p>https://github.com/bluenviron/mediamtx/releases</p>
                  </div>
                  <a
                    href="https://github.com/bluenviron/mediamtx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Documentação do MediaMTX
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Registration Form */}
      {showForm && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-blue-500/30 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">{editingId ? 'Editar Câmera' : 'Cadastrar Nova Câmera'}</h3>
            </div>
            <button onClick={resetForm} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Connection Section */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Signal className="w-4 h-4 text-blue-400" />
                Conexão
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Protocolo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleProtocolChange('rtsp')}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        formData.protocol === 'rtsp'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-[#0F172A] border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      RTSP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtocolChange('rtmp')}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        formData.protocol === 'rtmp'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                          : 'bg-[#0F172A] border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      RTMP
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Endereço IP (opcional)</label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => handleIpChange(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                Autenticação da Câmera
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Usuário</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin"
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Senha</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Canal</label>
                  <input
                    type="number"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: parseInt(e.target.value) })}
                    min={1}
                    max={16}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Stream URL Preview */}
            <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600">
              <label className="text-xs text-slate-400 block mb-1">URL RTSP/RTMP gerada automaticamente</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-green-400 font-mono break-all">
                  {generateStreamUrl() || 'Preencha o IP para gerar a URL...'}
                </code>
              </div>
              <div className="mt-2">
                <label className="text-xs text-slate-400 block mb-1">URL RTSP original (manual)</label>
                <input
                  type="text"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="rtsp://admin:senha@ip:porta/h264/ch1/main/av_stream"
                  className="w-full bg-[#1E293B] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            {/* RTSP → HLS/WebRTC Conversion */}
            <div className="bg-[#0F172A] rounded-lg p-4 border border-cyan-500/30">
              <h4 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Conversão RTSP → HLS/WebRTC
              </h4>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  onClick={handleConvertRtsp}
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={!formData.ip_address && !formData.stream_url}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  {useWebRtc ? 'Gerar URL WebRTC sugerida' : 'Gerar URL HLS sugerida'}
                </Button>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWebRtc}
                    onChange={(e) => setUseWebRtc(e.target.checked)}
                    className="rounded border-slate-600 bg-[#1E293B] text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-300">Usar WebRTC (menor latência)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRegisterOnSave}
                    onChange={(e) => setAutoRegisterOnSave(e.target.checked)}
                    className="rounded border-slate-600 bg-[#1E293B] text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-300">Registrar no MediaMTX ao salvar</span>
                </label>
                {formData.hls_url && (
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(formData.hls_url)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                  </button>
                )}
              </div>
              {formData.hls_url && (
                <div className="mt-2 bg-[#1E293B] rounded px-3 py-2 border border-slate-600">
                  <code className="text-xs text-cyan-400 font-mono break-all">{formData.hls_url}</code>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2">
                Com &quot;Registrar no MediaMTX ao salvar&quot; ativo, o sistema tenta criar o path automaticamente via API :9997.
              </p>
            </div>

            {/* Zone & Quality */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-green-400" />
                Zona e Qualidade
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Zona de Monitoramento *</label>
                  <select
                    value={formData.zone_id}
                    onChange={(e) => setFormData({ ...formData, zone_id: parseInt(e.target.value) })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value={0}>Selecione...</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Resolução</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="3840x2160">4K (3840x2160)</option>
                    <option value="1920x1080">Full HD (1920x1080)</option>
                    <option value="1280x720">HD (1280x720)</option>
                    <option value="640x480">SD (640x480)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">FPS</label>
                  <select
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 fps</option>
                    <option value={25}>25 fps</option>
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bitrate</label>
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
            </div>

            {/* Stream URL for Browser Viewing */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-cyan-400" />
                URL do Stream para Visualização no Navegador
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="text-xs text-slate-400 block mb-1">URL de visualização no navegador</label>
                  <input
                    type="text"
                    value={formData.hls_url}
                    onChange={(e) => setFormData({ ...formData, hls_url: e.target.value })}
                    placeholder="https://...trycloudflare.com/camera1/ ou http://host:8888/camera1/index.m3u8"
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tipo de Stream</label>
                  <select
                    value={formData.stream_type}
                    onChange={(e) => setFormData({ ...formData, stream_type: e.target.value as StreamType })}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="auto">Auto-detectar</option>
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="flv">HTTP-FLV (.flv)</option>
                    <option value="mpegts">MPEG-TS (.ts)</option>
                    <option value="mp4">MP4/H.264 (.mp4)</option>
                    <option value="webrtc">WebRTC (WHEP)</option>
                    <option value="iframe">Iframe (página MediaMTX)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Informe RTSP no campo acima para origem da câmera. Aqui use a URL reproduzível no navegador (HLS/WebRTC/iframe).
              </p>
            </div>

            {(formData.hls_url || formData.stream_url) && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Preview instantâneo</h4>
                <StreamPlayer
                  zoneName={zones.find((z) => z.id === formData.zone_id)?.name || 'Preview'}
                  status={formData.status}
                  protocol={formData.protocol}
                  resolution={formData.resolution}
                  hlsUrl={formData.hls_url}
                  rtspUrl={formData.stream_url}
                  streamType={formData.stream_type}
                  compact
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Atualizar Câmera' : 'Cadastrar Câmera'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Live View Mode */}
      {viewMode === 'live' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((stream) => (
            <StreamPlayer
              key={stream.id}
              zoneName={getZoneName(stream.zone_id)}
              cameraId={`CAM-${stream.id}`}
              status={stream.status}
              protocol={stream.protocol}
              resolution={stream.resolution}
              hlsUrl={stream.hls_url}
              streamType={streamTypes[stream.id] || 'auto'}
              rtspUrl={stream.stream_url}
            />
          ))}
          {streams.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
              <Camera className="w-12 h-12 mb-3 text-slate-500" />
              <p>Nenhuma câmera cadastrada</p>
              <p className="text-sm text-slate-500 mt-1">Clique em &quot;Nova Câmera&quot; para começar</p>
            </div>
          )}
        </div>
      )}

      {/* Grid View Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((stream) => {
            const statusColors = {
              online: 'border-green-500/30 bg-green-500/5',
              offline: 'border-red-500/30 bg-red-500/5',
              error: 'border-amber-500/30 bg-amber-500/5',
            };
            return (
              <div key={stream.id} className={`bg-[#1E293B] rounded-xl border ${statusColors[stream.status]} p-4 hover:shadow-lg transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">{getZoneName(stream.zone_id)}</span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${stream.status === 'online' ? 'bg-green-500 animate-pulse' : stream.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Protocolo:</span>
                    <span className={`font-mono px-1.5 py-0.5 rounded ${stream.protocol === 'rtsp' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {stream.protocol.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Resolução:</span>
                    <span className="text-slate-300">{stream.resolution}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>FPS:</span>
                    <span className="text-slate-300">{stream.fps}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bitrate:</span>
                    <span className="text-slate-300">{stream.bitrate}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="font-mono text-[10px] text-slate-500 truncate">{stream.stream_url}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                  <Button size="sm" variant="outline" onClick={() => setSelectedStream(stream)} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(stream)} className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(stream.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View Mode */}
      {viewMode === 'list' && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-[#0F172A]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Câmera/Zona</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Protocolo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Endereço</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Qualidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {streams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                      <p>Nenhuma câmera cadastrada</p>
                    </td>
                  </tr>
                ) : (
                  streams.map((stream) => (
                    <tr key={stream.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-slate-200">{getZoneName(stream.zone_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-1 rounded border ${
                          stream.protocol === 'rtsp'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {stream.protocol.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-400 max-w-[180px] truncate block">{stream.stream_url}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {stream.resolution} • {stream.fps}fps • {stream.bitrate}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 ${stream.status === 'online' ? 'text-green-400' : stream.status === 'offline' ? 'text-red-400' : 'text-amber-400'}`}>
                          <div className={`w-2 h-2 rounded-full ${stream.status === 'online' ? 'bg-green-500 animate-pulse' : stream.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="text-xs font-medium capitalize">{stream.status === 'online' ? 'Online' : stream.status === 'offline' ? 'Offline' : 'Erro'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setSelectedStream(stream)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(stream)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(stream.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/20">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stream Preview Modal */}
      {selectedStream && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700 w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">{getZoneName(selectedStream.zone_id)} - Visualização</h3>
              </div>
              <button onClick={() => setSelectedStream(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <StreamPlayer
                zoneName={getZoneName(selectedStream.zone_id)}
                cameraId={`CAM-${selectedStream.id}`}
                status={selectedStream.status}
                protocol={selectedStream.protocol}
                resolution={selectedStream.resolution}
                hlsUrl={selectedStream.hls_url}
                streamType={streamTypes[selectedStream.id] || 'auto'}
                rtspUrl={selectedStream.stream_url}
              />
            </div>
            <div className="p-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Protocolo</span>
                <p className="text-slate-200 font-mono mt-0.5">{selectedStream.protocol.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-slate-400">Resolução</span>
                <p className="text-slate-200 mt-0.5">{selectedStream.resolution}</p>
              </div>
              <div>
                <span className="text-slate-400">FPS / Bitrate</span>
                <p className="text-slate-200 mt-0.5">{selectedStream.fps}fps / {selectedStream.bitrate}</p>
              </div>
              <div>
                <span className="text-slate-400">Última Conexão</span>
                <p className="text-slate-200 mt-0.5">{selectedStream.last_connected ? new Date(selectedStream.last_connected).toLocaleString('pt-BR') : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Info */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Formatos de Stream H.264 Suportados</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600 text-center">
            <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-blue-400 mb-1">HLS (.m3u8)</h4>
            <p className="text-[10px] text-slate-400">Compatibilidade universal, latência média (~5-10s)</p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600 text-center">
            <Radio className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-purple-400 mb-1">HTTP-FLV (.flv)</h4>
            <p className="text-[10px] text-slate-400">Baixa latência (~1-3s), ideal para monitoramento</p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600 text-center">
            <Signal className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-green-400 mb-1">MPEG-TS (.ts)</h4>
            <p className="text-[10px] text-slate-400">Baixa latência, robusto para redes instáveis</p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-slate-600 text-center">
            <MonitorPlay className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-amber-400 mb-1">MP4/H.264</h4>
            <p className="text-[10px] text-slate-400">Reprodução nativa, ideal para gravações</p>
          </div>
          <div className="bg-[#0F172A] rounded-lg p-4 border border-cyan-500/30 text-center">
            <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-cyan-400 mb-1">WebRTC (WHEP)</h4>
            <p className="text-[10px] text-slate-400">Ultra-baixa latência (&lt;500ms), tempo real</p>
          </div>
        </div>
      </div>
    </div>
  );
}