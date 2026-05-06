export type DetectedStreamType = 'iframe' | 'hls' | 'flv' | 'mpegts' | 'mp4' | 'webrtc' | 'rtsp' | 'unknown';

export interface StreamValidationResult {
  ok: boolean;
  reason?: string;
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function detectStreamType(value: string): DetectedStreamType {
  const url = value.trim();
  if (!url) return 'unknown';

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
  if (lowerUrl.includes('/whep')) return 'webrtc';

  const parsed = safeParseUrl(url);
  if (!parsed) return 'unknown';

  const pathname = parsed.pathname.toLowerCase();
  const endsWith = (ext: string) => pathname.endsWith(ext);
  const hasVideoExtension = ['.m3u8', '.flv', '.ts', '.mp4', '.m4s'].some((ext) => endsWith(ext));
  const isCameraPage = /^\/camera[\w-]*\/$/i.test(parsed.pathname);
  const isCloudflarePage = parsed.hostname.includes('trycloudflare.com') && !hasVideoExtension;
  const isMediaMtxWebRtcPort = parsed.port === '8889' && !hasVideoExtension;
  const isLocalWebRtcPort =
    parsed.port === '8889' && ['localhost', '127.0.0.1'].includes(parsed.hostname.toLowerCase());

  if (isCameraPage || isCloudflarePage || isMediaMtxWebRtcPort || isLocalWebRtcPort) return 'iframe';
  if (endsWith('.m3u8')) return 'hls';
  if (endsWith('.flv')) return 'flv';
  if (endsWith('.ts')) return 'mpegts';
  if (endsWith('.mp4')) return 'mp4';

  return 'mp4';
}

export function validateStreamUrl(streamUrl: string): StreamValidationResult {
  const url = streamUrl.trim();
  if (!url) return { ok: false, reason: 'URL de stream vazia.' };

  const detected = detectStreamType(url);
  if (detected === 'unknown') {
    return { ok: false, reason: 'URL inválida ou formato não reconhecido.' };
  }

  if (detected === 'rtsp') {
    return {
      ok: false,
      reason: 'RTSP não é suportado diretamente no navegador. Converta via MediaMTX (HLS/WebRTC).',
    };
  }

  const parsed = safeParseUrl(url);
  if (!parsed) return { ok: false, reason: 'URL inválida.' };

  if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
    return {
      ok: false,
      reason: 'Mixed content: a aplicação HTTPS não pode abrir stream HTTP. Use URL HTTPS (ex.: Cloudflare Tunnel).',
    };
  }

  return { ok: true };
}
