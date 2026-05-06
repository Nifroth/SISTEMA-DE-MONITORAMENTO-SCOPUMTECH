import { useEffect, useMemo, useRef } from 'react';
import mpegts from 'mpegts.js';
import { BaseStreamPlayerProps } from './types';

interface FLVPlayerProps extends BaseStreamPlayerProps {
  streamFormat: 'flv' | 'mpegts';
}

export default function FLVPlayer({
  streamUrl,
  streamFormat,
  compact = false,
  onStatusChange,
}: FLVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heightClass = useMemo(() => (compact ? 'h-36' : 'h-48'), [compact]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onStatusChange?.('connecting');

    if (!mpegts.isSupported()) {
      onStatusChange?.('error', 'Player FLV/MPEG-TS não suportado neste navegador.');
      return;
    }

    const player = mpegts.createPlayer(
      { type: streamFormat, url: streamUrl, isLive: true },
      { enableWorker: true, liveBufferLatencyChasing: true }
    );
    player.attachMediaElement(video);
    player.load();
    player.play().catch(() => {});

    const onPlaying = () => onStatusChange?.('live');
    const onError = () => onStatusChange?.('error', `Falha ao reproduzir ${streamFormat.toUpperCase()}.`);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      try {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      } catch {
        // no-op
      }
    };
  }, [onStatusChange, streamFormat, streamUrl]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`relative ${heightClass} bg-black`}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
      </div>
    </div>
  );
}
