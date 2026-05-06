import { useMemo } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { BaseStreamPlayerProps, StreamConnectionStatus } from './types';

interface IframePlayerProps extends BaseStreamPlayerProps {
  status: StreamConnectionStatus;
  errorMessage?: string;
  reloadKey: number;
  onLoad: () => void;
  onError: () => void;
  onReconnect: () => void;
}

export default function IframePlayer({
  streamUrl,
  compact = false,
  status,
  errorMessage,
  reloadKey,
  onLoad,
  onError,
  onReconnect,
}: IframePlayerProps) {
  const heightClass = useMemo(() => (compact ? 'h-36' : 'h-48'), [compact]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`relative ${heightClass} bg-black`}>
        <iframe
          key={reloadKey}
          src={streamUrl}
          title="camera-stream-iframe"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; camera; microphone"
          onLoad={onLoad}
          onError={onError}
        />

        {status === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="flex items-center gap-2 text-slate-300 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Conectando ao player WebRTC...
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-xs text-slate-300">{errorMessage || 'Falha ao carregar player em iframe.'}</p>
              <button
                onClick={onReconnect}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40"
              >
                <RefreshCw className="w-3 h-3" />
                Reconectar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
