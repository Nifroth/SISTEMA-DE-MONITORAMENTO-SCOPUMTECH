import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, Loader2, RefreshCw } from 'lucide-react';
import { detectStreamType, validateStreamUrl } from '@/lib/streamTypeDetector';
import IframePlayer from './IframePlayer';
import HLSPlayer from './HLSPlayer';
import FLVPlayer from './FLVPlayer';
import NativeVideoPlayer from './NativeVideoPlayer';
import WebRTCPlayer from './WebRTCPlayer';
import { StreamConnectionStatus, StreamType } from './types';

const MAX_RETRIES = 5;

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

export type { StreamType };

export default function StreamPlayer({
  zoneName,
  status = 'online',
  protocol = 'rtsp',
  resolution = '1920x1080',
  compact = false,
  hlsUrl,
  rtspUrl,
  streamType = 'auto',
}: StreamPlayerProps) {
  const [connectionStatus, setConnectionStatus] = useState<StreamConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [cooldownMs, setCooldownMs] = useState(0);

  const streamUrl = useMemo(() => (hlsUrl?.trim() ? hlsUrl.trim() : rtspUrl?.trim() || ''), [hlsUrl, rtspUrl]);

  const resolvedType = useMemo(() => {
    if (!streamUrl) return 'unknown';
    if (streamType !== 'auto') return streamType;
    return detectStreamType(streamUrl);
  }, [streamType, streamUrl]);

  const validation = useMemo(() => validateStreamUrl(streamUrl), [streamUrl]);
  const hasPlayer = validation.ok && ['iframe', 'hls', 'flv', 'mpegts', 'mp4', 'webrtc'].includes(resolvedType);

  const handleStatusChange = useCallback((nextStatus: StreamConnectionStatus, error?: string) => {
    setConnectionStatus(nextStatus);
    if (nextStatus === 'live') {
      setRetryCount(0);
      setCooldownMs(0);
      setErrorMessage('');
      return;
    }
    if (nextStatus === 'error') {
      setErrorMessage(error || 'Falha ao carregar stream.');
    }
  }, []);

  useEffect(() => {
    if (!hasPlayer) {
      setConnectionStatus('error');
      setErrorMessage(validation.reason || 'URL inválida para stream.');
      return;
    }
    setConnectionStatus('connecting');
    setErrorMessage('');
  }, [hasPlayer, streamUrl, validation.reason]);

  useEffect(() => {
    if (connectionStatus !== 'error' || retryCount >= MAX_RETRIES) return;
    const delay = Math.min(2000 * Math.pow(2, retryCount), 12000);
    setCooldownMs(delay);

    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(prev - 250, 0));
    }, 250);
    const timer = setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      setReloadKey((prev) => prev + 1);
      setConnectionStatus('connecting');
    }, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [connectionStatus, retryCount]);

  const reconnectNow = useCallback(() => {
    setRetryCount(0);
    setCooldownMs(0);
    setReloadKey((prev) => prev + 1);
    setConnectionStatus('connecting');
    setErrorMessage('');
  }, []);

  const renderPlayer = () => {
    if (!hasPlayer) return null;
    if (resolvedType === 'iframe') {
      return (
        <IframePlayer
          streamUrl={streamUrl}
          zoneName={zoneName}
          compact={compact}
          reloadKey={reloadKey}
          status={connectionStatus}
          errorMessage={errorMessage}
          onLoad={() => handleStatusChange('live')}
          onError={() => handleStatusChange('error', 'Falha ao carregar iframe de stream.')}
          onReconnect={reconnectNow}
        />
      );
    }
    if (resolvedType === 'hls') {
      return (
        <HLSPlayer
          key={reloadKey}
          streamUrl={streamUrl}
          zoneName={zoneName}
          compact={compact}
          onStatusChange={handleStatusChange}
        />
      );
    }
    if (resolvedType === 'flv' || resolvedType === 'mpegts') {
      return (
        <FLVPlayer
          key={reloadKey}
          streamUrl={streamUrl}
          zoneName={zoneName}
          compact={compact}
          streamFormat={resolvedType}
          onStatusChange={handleStatusChange}
        />
      );
    }
    if (resolvedType === 'webrtc') {
      return (
        <WebRTCPlayer
          key={reloadKey}
          streamUrl={streamUrl}
          zoneName={zoneName}
          compact={compact}
          onStatusChange={handleStatusChange}
        />
      );
    }
    return (
      <NativeVideoPlayer
        key={reloadKey}
        streamUrl={streamUrl}
        zoneName={zoneName}
        compact={compact}
        onStatusChange={handleStatusChange}
      />
    );
  };

  return (
    <div className="space-y-0">
      {renderPlayer() || (
        <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
          <div className={`relative ${compact ? 'h-36' : 'h-48'} bg-black flex items-center justify-center`}>
            <div className="text-center px-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-slate-300">{errorMessage || 'Stream indisponível.'}</p>
              {rtspUrl?.startsWith('rtsp://') && (
                <p className="text-[11px] text-slate-400 mt-2">
                  RTSP precisa ser convertido para HLS/WebRTC no MediaMTX.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1E293B] rounded-b-xl border border-t-0 border-slate-700 px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span>{zoneName}</span>
            <span className="text-slate-500">•</span>
            <span>{resolution}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded border ${
                protocol === 'rtsp'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
              }`}
            >
              {protocol.toUpperCase()}
            </span>
            <span
              className={`px-2 py-0.5 rounded ${
                connectionStatus === 'live'
                  ? 'bg-green-500/20 text-green-400'
                  : connectionStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              {connectionStatus === 'live' ? 'Online' : connectionStatus === 'connecting' ? 'Conectando' : 'Offline'}
            </span>
          </div>
        </div>

        {connectionStatus === 'error' && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>{errorMessage}</span>
            <div className="flex items-center gap-2">
              {retryCount < MAX_RETRIES && cooldownMs > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Reconectando em {Math.ceil(cooldownMs / 1000)}s ({retryCount + 1}/{MAX_RETRIES})
                </span>
              )}
              <button
                onClick={reconnectNow}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-500/30 text-blue-300 bg-blue-500/10"
              >
                <RefreshCw className="w-3 h-3" />
                Reconectar
              </button>
            </div>
          </div>
        )}
        {status === 'error' && connectionStatus !== 'error' && (
          <p className="mt-2 text-[11px] text-amber-400">Status da câmera marcado com erro no cadastro.</p>
        )}
      </div>
    </div>
  );
}
