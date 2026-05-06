import { useEffect, useMemo, useRef } from 'react';
import { BaseStreamPlayerProps } from './types';

export default function WebRTCPlayer({ streamUrl, compact = false, onStatusChange }: BaseStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const heightClass = useMemo(() => (compact ? 'h-36' : 'h-48'), [compact]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    onStatusChange?.('connecting');

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      video.srcObject = event.streams[0];
      onStatusChange?.('live');
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        onStatusChange?.('error', 'Falha na conexão WebRTC.');
      }
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });
        if (!response.ok) throw new Error(`WHEP ${response.status}`);
        const answerSdp = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (error) {
        onStatusChange?.('error', error instanceof Error ? error.message : 'Erro WebRTC.');
      }
    })();

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
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
