export type StreamType = 'hls' | 'flv' | 'mpegts' | 'mp4' | 'webrtc' | 'iframe' | 'auto';

export type StreamConnectionStatus = 'connecting' | 'live' | 'error';

export interface BaseStreamPlayerProps {
  zoneName: string;
  streamUrl: string;
  compact?: boolean;
  onStatusChange?: (status: StreamConnectionStatus, error?: string) => void;
}
