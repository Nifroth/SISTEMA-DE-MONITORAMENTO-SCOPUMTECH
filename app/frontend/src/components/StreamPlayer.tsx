import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Radio,
  RefreshCw,
  Loader2,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Camera as CameraIcon,
  Wifi,
  WifiOff,
  Brain,
  Eye,
} from 'lucide-react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { client } from '@/lib/api';

export type StreamType = 'hls' | 'flv' | 'mpegts' | 'mp4' | 'webrtc' | 'iframe' | 'auto';

interface StreamPlayerProps {
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
  hlsUrl?: string;
  rtspUrl?: string;
  streamType?: StreamType;
}

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  confidence: number;
  label: string;
}

type ConnectionStatus = 'connecting' | 'live' | 'error';

type HealthStatus = 'healthy' | 'buffering' | 'error';

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoneName: string;
}

interface StreamHealthProps {
  status: HealthStatus;
  latencyMs?: number;
}

/** Auto-retry configuration */
const MAX_AUTO_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;

/** Calculate exponential backoff delay */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/** Detect if URL points to an embeddable MediaMTX/WebRTC HTML page */
function isWebRtcPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hasVideoFileExtension = ['.m3u8', '.flv', '.ts', '.mp4', '.m4s'].some((ext) =>
      pathname.endsWith(ext)
    );

    if (hasVideoFileExtension) return false;
    if (pathname.includes('/whep') || pathname.includes('/whip')) return false;
    if (pathname.includes('/webrtc') && pathname.endsWith('/')) return true;
    if (parsed.hostname.includes('trycloudflare.com') && pathname.endsWith('/')) return true;
    if (pathname.startsWith('/camera') && pathname.endsWith('/')) return true;
    return false;
  } catch {
    return false;
  }
}

/** Detect stream type from URL/endpoint pattern */
function detectStreamType(url: string): 'hls' | 'flv' | 'mpegts' | 'mp4' | 'webrtc' | 'iframe' {
  const lowerUrl = url.toLowerCase();
  if (isWebRtcPageUrl(url)) return 'iframe';
  if (lowerUrl.includes('/whep') || lowerUrl.includes('/webrtc')) return 'webrtc';
  const path = lowerUrl.split('?')[0];
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.flv')) return 'flv';
  if (path.endsWith('.ts')) return 'mpegts';
  return 'mp4';
}

/** Stream Health Indicator */
function StreamHealthIndicator({ status, latencyMs }: StreamHealthProps) {
  const colorMap: Record<HealthStatus, string> = {
    healthy: 'bg-green-500',
    buffering: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500',
  };

  const iconMap: Record<HealthStatus, typeof Wifi> = {
    healthy: Wifi,
    buffering: Wifi,
    error: WifiOff,
  };

  const Icon = iconMap[status];

  return (
    <div className="absolute top-2 right-24 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
      <div className={`w-2 h-2 rounded-full ${colorMap[status]}`} />
      <Icon className="w-3 h-3 text-slate-300" />
      {latencyMs !== undefined && (
        <span className="text-[10px] text-slate-400 font-mono">{latencyMs}ms</span>
      )}
    </div>
  );
}

/** Video Controls Toolbar - appears on hover */
function VideoControls({ videoRef, containerRef, zoneName }: VideoControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, [containerRef]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [videoRef]);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `snapshot-${zoneName}-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [videoRef, zoneName]);

  return (
    <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
      <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-600/50">
        <button
          onClick={toggleMute}
          className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
          title={isMuted ? 'Ativar som' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={takeSnapshot}
          className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
          title="Capturar frame"
        >
          <CameraIcon className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/** Shared overlay components */
function StreamOverlays({
  zoneName,
  protocol = 'rtsp',
  status = 'online',
  resolution = '1920x1080',
  connectionStatus,
  formatLabel,
}: {
  zoneName: string;
  protocol?: string;
  status?: string;
  resolution?: string;
  connectionStatus: ConnectionStatus;
  formatLabel: string;
}) {
  const protocolBadge =
    protocol === 'rtsp'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  const statusLabel: Record<ConnectionStatus, string> = {
    connecting: 'Conectando...',
    live: 'Ao Vivo',
    error: 'Erro de Conexão',
  };

  const statusColor: Record<ConnectionStatus, string> = {
    connecting: 'bg-amber-500/20 text-amber-400',
    live: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <>
      {/* Top Left */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
          <Camera className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-white">{zoneName}</span>
        </div>
      </div>

      {/* Top Right */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded border ${protocolBadge}`}>
          <Radio className="w-3 h-3" />
          <span className="text-xs font-mono uppercase">{protocol}</span>
        </div>
        {status === 'online' && connectionStatus === 'live' && (
          <div className="flex items-center gap-1 bg-red-500/80 px-2 py-1 rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-medium text-white">REC</span>
          </div>
        )}
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${statusColor[connectionStatus]}`}>
          {connectionStatus === 'live' && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          {connectionStatus === 'connecting' && (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          <span className="text-xs">{statusLabel[connectionStatus]}</span>
        </div>
      </div>

      {/* Bottom Right */}
      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
        <span className="text-xs text-slate-300">{resolution} • {formatLabel}</span>
      </div>
    </>
  );
}

/** Auto-retry error overlay with countdown */
function ErrorOverlayWithRetry({
  formatLabel,
  onManualRetry,
  retryCount,
  maxRetries,
  countdown,
}: {
  formatLabel: string;
  onManualRetry: () => void;
  retryCount: number;
  maxRetries: number;
  countdown: number;
}) {
  const isAutoRetrying = retryCount < maxRetries && countdown > 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <Camera className="w-6 h-6 text-red-400" />
        </div>
        <span className="text-xs text-red-400">Erro de Conexão {formatLabel}</span>
        {isAutoRetrying && (
          <span className="text-xs text-amber-400">
            Reconectando em {Math.ceil(countdown / 1000)}s... (tentativa {retryCount + 1}/{maxRetries})
          </span>
        )}
        {retryCount >= maxRetries && (
          <span className="text-xs text-slate-400">
            Tentativas automáticas esgotadas
          </span>
        )}
        <button
          onClick={onManualRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reconectar
        </button>
      </div>
    </div>
  );
}

/** Hook for auto-retry with exponential backoff */
function useAutoRetry(
  connectionStatus: ConnectionStatus,
  initFn: () => void
): { retryCount: number; countdown: number; resetRetries: () => void } {
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset retries on successful connection
  useEffect(() => {
    if (connectionStatus === 'live') {
      setRetryCount(0);
      setCountdown(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [connectionStatus]);

  // Auto-retry on error
  useEffect(() => {
    if (connectionStatus === 'error' && retryCount < MAX_AUTO_RETRIES) {
      const delay = getRetryDelay(retryCount);
      setCountdown(delay);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          const next = prev - 100;
          return next > 0 ? next : 0;
        });
      }, 100);

      timerRef.current = setTimeout(() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setRetryCount((prev) => prev + 1);
        initFn();
      }, delay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [connectionStatus, retryCount, initFn]);

  const resetRetries = useCallback(() => {
    setRetryCount(0);
    setCountdown(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  return { retryCount, countdown, resetRetries };
}

export default function StreamPlayer({
  zoneName,
  cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
  hlsUrl,
  rtspUrl,
  streamType = 'auto',
}: StreamPlayerProps) {
  const hasStreamUrl = Boolean(hlsUrl && hlsUrl.trim().length > 0);
  const hasRtspUrl = Boolean(rtspUrl && rtspUrl.trim().length > 0);

  if (!hasStreamUrl && !hasRtspUrl) {
    return (
      <SimulationPlayer
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  if (!hasStreamUrl && hasRtspUrl) {
    return (
      <SnapshotPlayer
        rtspUrl={rtspUrl!}
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  const resolvedType = streamType === 'auto' ? detectStreamType(hlsUrl!) : streamType;

  if (resolvedType === 'iframe') {
    return (
      <IframePlayer
        frameUrl={hlsUrl!}
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  if (resolvedType === 'webrtc') {
    return (
      <WebRtcPlayer
        whepUrl={hlsUrl!}
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  if (resolvedType === 'hls') {
    return (
      <HlsPlayer
        hlsUrl={hlsUrl!}
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  if (resolvedType === 'flv' || resolvedType === 'mpegts') {
    return (
      <MpegtsPlayer
        streamUrl={hlsUrl!}
        streamFormat={resolvedType}
        zoneName={zoneName}
        cameraId={cameraId}
        status={status}
        protocol={protocol}
        resolution={resolution}
        compact={compact}
      />
    );
  }

  return (
    <NativePlayer
      streamUrl={hlsUrl!}
      zoneName={zoneName}
      cameraId={cameraId}
      status={status}
      protocol={protocol}
      resolution={resolution}
      compact={compact}
    />
  );
}

/** iframe player for MediaMTX/WebRTC pages */
function IframePlayer({
  frameUrl,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  frameUrl: string;
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [reloadKey, setReloadKey] = useState(0);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');

  const initFrame = useCallback(() => {
    setConnectionStatus('connecting');
    setHealthStatus('healthy');
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    initFrame();
  }, [initFrame]);

  const { retryCount, countdown, resetRetries } = useAutoRetry(connectionStatus, initFrame);

  const handleManualRetry = useCallback(() => {
    resetRetries();
    initFrame();
  }, [resetRetries, initFrame]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        <iframe
          key={reloadKey}
          src={frameUrl}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; camera; microphone"
          onLoad={() => {
            setConnectionStatus('live');
            setHealthStatus('healthy');
          }}
          onError={() => {
            setConnectionStatus('error');
            setHealthStatus('error');
          }}
        />

        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">Conectando ao player WebRTC...</span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <ErrorOverlayWithRetry
            formatLabel="WebRTC iframe"
            onManualRetry={handleManualRetry}
            retryCount={retryCount}
            maxRetries={MAX_AUTO_RETRIES}
            countdown={countdown}
          />
        )}

        {connectionStatus === 'live' && <StreamHealthIndicator status={healthStatus} />}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel="WebRTC iframe"
        />
      </div>
    </div>
  );
}

/** WebRTC WHEP Player for ultra-low latency streams */
function WebRtcPlayer({
  whepUrl,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  whepUrl: string;
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');

  const initWebRtc = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setConnectionStatus('connecting');
    setHealthStatus('healthy');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (video && event.streams[0]) {
        video.srcObject = event.streams[0];
        setConnectionStatus('live');
        setHealthStatus('healthy');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('error');
        setHealthStatus('error');
      } else if (pc.iceConnectionState === 'connected') {
        setConnectionStatus('live');
        setHealthStatus('healthy');
      }
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });

        if (!response.ok) {
          throw new Error(`WHEP error: ${response.status}`);
        }

        const answerSdp = await response.text();
        if (!answerSdp.includes('v=0') || !answerSdp.includes('m=')) {
          throw new Error('WHEP endpoint did not return SDP answer');
        }
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (err) {
        console.error('WebRTC connection failed:', err);
        setConnectionStatus('error');
        setHealthStatus('error');
      }
    })();
  }, [whepUrl]);

  useEffect(() => {
    initWebRtc();
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [initWebRtc]);

  const { retryCount, countdown, resetRetries } = useAutoRetry(connectionStatus, initWebRtc);

  const handleManualRetry = useCallback(() => {
    resetRetries();
    initWebRtc();
  }, [resetRetries, initWebRtc]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div ref={containerRef} className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">Conectando via WebRTC...</span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <ErrorOverlayWithRetry
            formatLabel="WebRTC"
            onManualRetry={handleManualRetry}
            retryCount={retryCount}
            maxRetries={MAX_AUTO_RETRIES}
            countdown={countdown}
          />
        )}

        {connectionStatus === 'live' && (
          <>
            <StreamHealthIndicator status={healthStatus} />
            <VideoControls videoRef={videoRef} containerRef={containerRef} zoneName={zoneName} />
          </>
        )}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel="WebRTC"
        />
      </div>
    </div>
  );
}

/** HLS Video Player with real camera stream */
function HlsPlayer({
  hlsUrl,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  hlsUrl: string;
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setConnectionStatus('connecting');
    setHealthStatus('healthy');

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setConnectionStatus('live');
        setHealthStatus('healthy');
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        // Update buffer health stats
        if (hls.media) {
          const buffered = hls.media.buffered;
          if (buffered.length > 0) {
            const bufferEnd = buffered.end(buffered.length - 1);
            const currentTime = hls.media.currentTime;
            const bufferLevel = bufferEnd - currentTime;
            setLatencyMs(Math.round(bufferLevel * 1000));
            setHealthStatus(bufferLevel < 0.5 ? 'buffering' : 'healthy');
          }
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setConnectionStatus('error');
              setHealthStatus('error');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setConnectionStatus('error');
              setHealthStatus('error');
              hls.destroy();
              break;
          }
        } else {
          // Non-fatal error - might indicate buffering
          setHealthStatus('buffering');
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setConnectionStatus('live');
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setConnectionStatus('error');
        setHealthStatus('error');
      });
    } else {
      setConnectionStatus('error');
      setHealthStatus('error');
    }
  }, [hlsUrl]);

  useEffect(() => {
    initHls();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initHls]);

  const { retryCount, countdown, resetRetries } = useAutoRetry(connectionStatus, initHls);

  const handleManualRetry = useCallback(() => {
    resetRetries();
    initHls();
  }, [resetRetries, initHls]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div ref={containerRef} className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">Conectando ao stream HLS...</span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <ErrorOverlayWithRetry
            formatLabel="HLS"
            onManualRetry={handleManualRetry}
            retryCount={retryCount}
            maxRetries={MAX_AUTO_RETRIES}
            countdown={countdown}
          />
        )}

        {connectionStatus === 'live' && (
          <>
            <StreamHealthIndicator status={healthStatus} latencyMs={latencyMs} />
            <VideoControls videoRef={videoRef} containerRef={containerRef} zoneName={zoneName} />
          </>
        )}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel="HLS"
        />
      </div>
    </div>
  );
}

/** mpegts.js-based player for HTTP-FLV and MPEG-TS H.264 streams */
function MpegtsPlayer({
  streamUrl,
  streamFormat,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  streamUrl: string;
  streamFormat: 'flv' | 'mpegts';
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<mpegts.Player | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);

  // Store event listener references for proper cleanup
  const videoListenersRef = useRef<{ event: string; handler: () => void }[]>([]);

  const cleanupVideoListeners = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      videoListenersRef.current.forEach(({ event, handler }) => {
        video.removeEventListener(event, handler);
      });
    }
    videoListenersRef.current = [];
  }, []);

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous instance properly
    cleanupVideoListeners();

    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.unload();
        playerRef.current.detachMediaElement();
        playerRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
      playerRef.current = null;
    }

    setConnectionStatus('connecting');
    setHealthStatus('healthy');

    if (!mpegts.isSupported()) {
      setConnectionStatus('error');
      setHealthStatus('error');
      return;
    }

    const player = mpegts.createPlayer(
      {
        type: streamFormat,
        isLive: true,
        url: streamUrl,
      },
      {
        enableWorker: true,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.5,
        liveBufferLatencyMinRemain: 0.3,
      }
    );

    player.attachMediaElement(video);
    player.load();
    player.play().then(() => {
      setConnectionStatus('live');
      setHealthStatus('healthy');
    }).catch(() => {
      // Autoplay may be blocked
    });

    player.on(mpegts.Events.ERROR, () => {
      setConnectionStatus('error');
      setHealthStatus('error');
    });

    player.on(mpegts.Events.LOADING_COMPLETE, () => {
      // Stream ended or loading complete
    });

    player.on(mpegts.Events.STATISTICS_INFO, (stats: mpegts.StatisticsInfo) => {
      // Update health from statistics
      if (stats.speed !== undefined) {
        const speed = stats.speed;
        if (speed < 10) {
          setHealthStatus('buffering');
        } else {
          setHealthStatus('healthy');
        }
      }
      // Use playerCurrentTime and currentSegmentIndex for latency estimation
      if (stats.playerType !== undefined) {
        const videoCurrentTime = video.currentTime;
        const buffered = video.buffered;
        if (buffered.length > 0) {
          const bufferEnd = buffered.end(buffered.length - 1);
          const bufferLatency = bufferEnd - videoCurrentTime;
          setLatencyMs(Math.round(bufferLatency * 1000));
        }
      }
    });

    // Add video element event listeners with tracking
    const handlePlaying = () => {
      setConnectionStatus('live');
      setHealthStatus('healthy');
    };
    const handleError = () => {
      setConnectionStatus('error');
      setHealthStatus('error');
    };
    const handleWaiting = () => {
      setHealthStatus('buffering');
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);

    videoListenersRef.current = [
      { event: 'playing', handler: handlePlaying },
      { event: 'error', handler: handleError },
      { event: 'waiting', handler: handleWaiting },
    ];

    playerRef.current = player;
  }, [streamUrl, streamFormat, cleanupVideoListeners]);

  useEffect(() => {
    initPlayer();
    return () => {
      cleanupVideoListeners();
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.unload();
          playerRef.current.detachMediaElement();
          playerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [initPlayer, cleanupVideoListeners]);

  const { retryCount, countdown, resetRetries } = useAutoRetry(connectionStatus, initPlayer);

  const handleManualRetry = useCallback(() => {
    resetRetries();
    initPlayer();
  }, [resetRetries, initPlayer]);

  const formatLabel = streamFormat === 'flv' ? 'HTTP-FLV' : 'MPEG-TS';

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div ref={containerRef} className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">Conectando ao stream {formatLabel}...</span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <ErrorOverlayWithRetry
            formatLabel={formatLabel}
            onManualRetry={handleManualRetry}
            retryCount={retryCount}
            maxRetries={MAX_AUTO_RETRIES}
            countdown={countdown}
          />
        )}

        {connectionStatus === 'live' && (
          <>
            <StreamHealthIndicator status={healthStatus} latencyMs={latencyMs} />
            <VideoControls videoRef={videoRef} containerRef={containerRef} zoneName={zoneName} />
          </>
        )}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel={formatLabel}
        />
      </div>
    </div>
  );
}

/** Native HTML5 video player for MP4/H.264 streams */
function NativePlayer({
  streamUrl,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  streamUrl: string;
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setConnectionStatus('connecting');
    setHealthStatus('healthy');
    video.src = streamUrl;
    video.load();
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      setConnectionStatus('live');
      setHealthStatus('healthy');
    };
    const handleError = () => {
      setConnectionStatus('error');
      setHealthStatus('error');
    };
    const handleLoadedData = () => {
      setConnectionStatus('live');
      setHealthStatus('healthy');
      video.play().catch(() => {});
    };
    const handleWaiting = () => {
      setHealthStatus('buffering');
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);

    initPlayer();

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [initPlayer]);

  const { retryCount, countdown, resetRetries } = useAutoRetry(connectionStatus, initPlayer);

  const handleManualRetry = useCallback(() => {
    resetRetries();
    initPlayer();
  }, [resetRetries, initPlayer]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div ref={containerRef} className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">Conectando ao stream MP4...</span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <ErrorOverlayWithRetry
            formatLabel="MP4/H.264"
            onManualRetry={handleManualRetry}
            retryCount={retryCount}
            maxRetries={MAX_AUTO_RETRIES}
            countdown={countdown}
          />
        )}

        {connectionStatus === 'live' && (
          <>
            <StreamHealthIndicator status={healthStatus} />
            <VideoControls videoRef={videoRef} containerRef={containerRef} zoneName={zoneName} />
          </>
        )}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel="MP4/H.264"
        />
      </div>
    </div>
  );
}

/** RTSP Snapshot Player - polls JPEG snapshots from backend with optional AI detection */
function SnapshotPlayer({
  rtspUrl,
  zoneName,
  cameraId: _cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  rtspUrl: string;
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [personCount, setPersonCount] = useState(0);
  const [totalObjects, setTotalObjects] = useState(0);

  const fetchSnapshot = useCallback(async () => {
    try {
      setConnectionStatus('connecting');

      const endpoint = aiEnabled
        ? '/api/v1/yolo-detection/detect'
        : '/api/v1/rtsp-snapshot/capture';

      const requestData = aiEnabled
        ? { stream_url: rtspUrl, confidence: 0.5 }
        : { stream_url: rtspUrl };

      const response = await client.apiCall.invoke({
        url: endpoint,
        method: 'POST',
        data: requestData,
      });

      // The response from apiCall.invoke returns parsed data
      const responseData = response.data;

      // Handle AI detection metadata
      if (aiEnabled && responseData) {
        if (responseData.person_count !== undefined) setPersonCount(responseData.person_count || 0);
        if (responseData.total_objects !== undefined) setTotalObjects(responseData.total_objects || 0);
      }

      // Handle image data - could be base64 or a URL
      if (responseData?.image_base64) {
        const imageUrl = `data:image/jpeg;base64,${responseData.image_base64}`;
        setImageSrc((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return imageUrl;
        });
        setConnectionStatus('live');
        setErrorMsg('');
      } else if (responseData?.image_url) {
        setImageSrc((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return responseData.image_url;
        });
        setConnectionStatus('live');
        setErrorMsg('');
      } else {
        // If the response doesn't contain expected image data, show error
        throw new Error('Resposta do backend não contém dados de imagem');
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      setConnectionStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao capturar snapshot';
      // Provide more specific error messages
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setErrorMsg('Edge function não encontrada. Verifique se o backend está configurado.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setErrorMsg('Backend inacessível. Verifique sua conexão.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        setErrorMsg('Timeout ao conectar com a câmera. Verifique a URL RTSP.');
      } else if (errorMessage.includes('ffmpeg') || errorMessage.includes('FFmpeg')) {
        setErrorMsg('FFmpeg não encontrado no servidor. Instale o FFmpeg no backend.');
      } else {
        setErrorMsg(errorMessage);
      }
    }
  }, [rtspUrl, aiEnabled]);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 2000);
    return () => {
      clearInterval(interval);
      setImageSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, [fetchSnapshot]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`group relative ${compact ? 'h-36' : 'h-48'} bg-black`}>
        {imageSrc && (
          <img
            src={imageSrc}
            alt={`Snapshot ${zoneName}`}
            className="w-full h-full object-cover"
          />
        )}

        {connectionStatus === 'connecting' && !imageSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-300">
                {aiEnabled ? 'Detectando objetos via YOLOv8...' : 'Capturando snapshot RTSP...'}
              </span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && !imageSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-xs text-red-400">{errorMsg || 'Erro de Conexão RTSP'}</span>
              <button
                onClick={fetchSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reconectar
              </button>
            </div>
          </div>
        )}

        {/* AI Detection Toggle Button */}
        <div className="absolute top-2 right-20 z-30">
          <button
            onClick={() => setAiEnabled((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
              aiEnabled
                ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30'
                : 'bg-slate-500/20 border-slate-500/40 text-slate-400 hover:bg-slate-500/30'
            }`}
            title={aiEnabled ? 'Desativar detecção IA' : 'Ativar detecção IA'}
          >
            {aiEnabled ? <Brain className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{aiEnabled ? 'IA' : 'OFF'}</span>
          </button>
        </div>

        {/* AI Detection Info Overlay */}
        {aiEnabled && connectionStatus === 'live' && (
          <div className="absolute top-10 right-2 z-30 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-mono">YOLOv8</span>
            </div>
            <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-[10px] text-blue-400 font-mono">
                Pessoas: {personCount}
              </span>
            </div>
            <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-[10px] text-amber-400 font-mono">
                Objetos: {totalObjects}
              </span>
            </div>
          </div>
        )}

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus={connectionStatus}
          formatLabel={aiEnabled ? 'YOLOv8 AI' : 'RTSP Snapshot'}
        />
      </div>
    </div>
  );
}

/** Canvas-based simulation player (fallback when no stream URL) */
function SimulationPlayer({
  zoneName,
  cameraId,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
}: {
  zoneName: string;
  cameraId?: string;
  status?: string;
  protocol?: string;
  resolution?: string;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const boxesRef = useRef<DetectionBox[]>([]);
  const [personCount, setPersonCount] = useState(Math.floor(Math.random() * 5) + 3);
  const noiseDataRef = useRef<ImageData | null>(null);
  const frameCountRef = useRef(0);

  // Initialize detection boxes
  useEffect(() => {
    const boxes: DetectionBox[] = [];
    const numBoxes = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numBoxes; i++) {
      boxes.push({
        x: Math.random() * 0.6 + 0.1,
        y: Math.random() * 0.4 + 0.3,
        width: Math.random() * 0.08 + 0.06,
        height: Math.random() * 0.15 + 0.2,
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.001,
        confidence: Math.random() * 0.12 + 0.85,
        label: Math.random() > 0.3 ? 'pessoa' : 'criança',
      });
    }
    boxesRef.current = boxes;
  }, []);

  // Periodically change person count
  useEffect(() => {
    const interval = setInterval(() => {
      setPersonCount(Math.floor(Math.random() * 6) + 2);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    frameCountRef.current++;

    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(0.5, '#161b22');
    gradient.addColorStop(1, '#0d1117');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle noise/grain effect
    if (frameCountRef.current % 3 === 0 || !noiseDataRef.current) {
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 16) {
        const noise = Math.random() * 15;
        data[i] = noise;
        data[i + 1] = noise;
        data[i + 2] = noise;
        data[i + 3] = 25;
      }
      noiseDataRef.current = imageData;
    }
    if (noiseDataRef.current) {
      ctx.putImageData(noiseDataRef.current, 0, 0);
    }

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Update and draw detection boxes
    const boxes = boxesRef.current;
    boxes.forEach((box) => {
      box.x += box.vx;
      box.y += box.vy;

      if (box.x < 0.05 || box.x + box.width > 0.95) box.vx *= -1;
      if (box.y < 0.1 || box.y + box.height > 0.9) box.vy *= -1;

      box.x = Math.max(0.05, Math.min(0.95 - box.width, box.x));
      box.y = Math.max(0.1, Math.min(0.9 - box.height, box.y));

      const bx = box.x * w;
      const by = box.y * h;
      const bw = box.width * w;
      const bh = box.height * h;

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      const cornerLen = 8;
      ctx.strokeStyle = 'rgba(34, 197, 94, 1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(bx, by - 18, 85, 16);
      ctx.fillStyle = '#22c55e';
      ctx.font = '11px monospace';
      ctx.fillText(`${box.label} ${(box.confidence * 100).toFixed(0)}%`, bx + 3, by - 6);
    });

    // Timestamp overlay
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
    const dateStr = now.toLocaleDateString('pt-BR');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(8, 8, 155, 38);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${dateStr} ${timeStr}`, 14, 25);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`CAM: ${cameraId || 'SIM-001'}`, 14, 40);

    // Person count
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(8, h - 36, 130, 28);
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Pessoas: ${personCount}`, 14, h - 17);

    // FPS indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(w - 78, h - 30, 70, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`30fps ${resolution?.split('x')[1] || '1080'}p`, w - 72, h - 14);

    animationRef.current = requestAnimationFrame(drawFrame);
  }, [cameraId, personCount, resolution]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawFrame]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`relative ${compact ? 'h-36' : 'h-48'}`}>
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-cover"
        />

        <StreamOverlays
          zoneName={zoneName}
          protocol={protocol}
          status={status}
          resolution={resolution}
          connectionStatus="live"
          formatLabel="Simulação"
        />
      </div>
    </div>
  );
}