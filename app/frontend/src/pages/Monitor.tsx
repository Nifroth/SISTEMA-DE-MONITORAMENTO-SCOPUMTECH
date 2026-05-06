import { useEffect, useState } from 'react';
import { createEvent, fetchEvents, fetchStreams, fetchZones, MonitoringEvent, MonitoringZone, type CameraStream } from '@/lib/api';
import { UserPlus, UserMinus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreamPlayer from '@/components/stream/StreamPlayer';

export default function MonitorPage() {
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [streams, setStreams] = useState<CameraStream[]>([]);
  const [recentEvents, setRecentEvents] = useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [zonesData, eventsData, streamsData] = await Promise.all([
        fetchZones(),
        fetchEvents(20),
        fetchStreams(),
      ]);
      setZones(zonesData);
      setRecentEvents(eventsData.items);
      setStreams(streamsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function simulateEvent(zoneId: number, eventType: 'entry' | 'exit', personType: 'adult' | 'child') {
    setSimulating(true);
    try {
      const newEvent = await createEvent({
        zone_id: zoneId,
        event_type: eventType,
        person_type: personType,
        timestamp: new Date().toISOString(),
        confidence: Math.random() * 0.15 + 0.85,
      });
      setRecentEvents((prev) => [newEvent, ...prev].slice(0, 20));
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const activeZones = zones.filter((z) => z.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoramento em Tempo Real</h1>
        <p className="text-slate-400 text-sm mt-1">Streams RTSP/RTMP das câmeras com detecção de pessoas ao vivo</p>
      </div>

      {/* Camera Grid with Stream Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {activeZones.slice(0, 4).map((zone) => {
          const stream = streams.find((s) => s.zone_id === zone.id);
          return (
            <div key={zone.id} className="space-y-0">
              <StreamPlayer
                zoneName={zone.name}
                cameraId={zone.camera_id}
                status={stream?.status || 'online'}
                protocol={stream?.protocol || 'rtsp'}
                resolution={stream?.resolution || '1920x1080'}
                hlsUrl={stream?.hls_url}
                rtspUrl={stream?.stream_url}
              />

              {/* Simulation Controls */}
              <div className="bg-[#1E293B] rounded-b-xl border border-t-0 border-slate-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{zone.location}</span>
                  <span className="text-xs text-slate-500">{zone.camera_id}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                    onClick={() => simulateEvent(zone.id, 'entry', 'adult')}
                    disabled={simulating}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Adulto +
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    onClick={() => simulateEvent(zone.id, 'exit', 'adult')}
                    disabled={simulating}
                  >
                    <UserMinus className="w-3 h-3 mr-1" />
                    Adulto -
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                    onClick={() => simulateEvent(zone.id, 'entry', 'child')}
                    disabled={simulating}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Criança +
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                    onClick={() => simulateEvent(zone.id, 'exit', 'child')}
                    disabled={simulating}
                  >
                    <UserMinus className="w-3 h-3 mr-1" />
                    Criança -
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Feed */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Feed de Eventos ao Vivo</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">Atualizado</span>
          </div>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {recentEvents.map((event) => {
            const zone = zones.find((z) => z.id === event.zone_id);
            return (
              <div key={event.id} className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-lg border border-slate-600">
                <div className={`w-2 h-2 rounded-full ${event.event_type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${event.event_type === 'entry' ? 'text-green-400' : 'text-red-400'}`}>
                      {event.event_type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${event.person_type === 'adult' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {event.person_type === 'adult' ? 'Adulto' : 'Criança'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {zone?.name || `Zona ${event.zone_id}`} • Confiança: {(event.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}