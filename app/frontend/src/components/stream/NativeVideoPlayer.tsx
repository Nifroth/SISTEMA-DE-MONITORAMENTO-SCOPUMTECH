import { useEffect, useMemo, useRef } from 'react';
import { BaseStreamPlayerProps } from './types';

export default function NativeVideoPlayer({
  streamUrl,
  compact = false,
  onStatusChange,
}: BaseStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heightClass = useMemo(() => (compact ? 'h-36' : 'h-48'), [compact]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onStatusChange?.('connecting');
    video.src = streamUrl;
    video.load();

    const onLoaded = () => {
      video.play().catch(() => {});
      onStatusChange?.('live');
    };
    const onError = () => onStatusChange?.('error', 'Falha ao reproduzir stream nativo.');

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      video.pause();
      video.removeAttribute('src');
      video.load();
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
