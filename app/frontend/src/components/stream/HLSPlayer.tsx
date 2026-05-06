import { useEffect, useMemo, useRef } from 'react';
import Hls from 'hls.js';
import { BaseStreamPlayerProps } from './types';

export default function HLSPlayer({ streamUrl, compact = false, onStatusChange }: BaseStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heightClass = useMemo(() => (compact ? 'h-36' : 'h-48'), [compact]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onStatusChange?.('connecting');

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 8 });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        onStatusChange?.('live');
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onStatusChange?.('error', `HLS fatal error (${data.type})`);
      });

      return () => hls.destroy();
    }

    video.src = streamUrl;
    const onLoaded = () => {
      video.play().catch(() => {});
      onStatusChange?.('live');
    };
    const onError = () => onStatusChange?.('error', 'Player HLS não suportado neste navegador.');
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
    };
  }, [onStatusChange, streamUrl]);

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden">
      <div className={`relative ${heightClass} bg-black`}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
      </div>
    </div>
  );
}
