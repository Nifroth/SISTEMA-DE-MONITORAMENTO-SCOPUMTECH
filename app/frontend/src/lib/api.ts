import { createClient } from '@metagptx/web-sdk';

export const client = createClient();
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = (viteEnv?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 12000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

async function apiJson<T>(path: string, init?: RequestInit, retries = 1): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não configurado.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      if (retries > 0 && RETRYABLE_STATUS.has(response.status)) {
        return apiJson<T>(path, init, retries - 1);
      }
      throw new Error(`API ${response.status}: ${text || response.statusText}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    const retriableNetworkError =
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === 'AbortError');
    if (retries > 0 && retriableNetworkError) {
      return apiJson<T>(path, init, retries - 1);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao conectar com a API.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export interface MonitoringZone {
  id: number;
  name: string;
  zone_type: 'entrance' | 'exit' | 'internal';
  camera_id: string;
  status: 'active' | 'inactive';
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonitoringEvent {
  id: number;
  zone_id: number;
  event_type: 'entry' | 'exit';
  person_type: 'adult' | 'child';
  timestamp: string;
  confidence: number;
  created_at?: string;
  updated_at?: string;
}

export interface CameraStream {
  id: number;
  zone_id: number;
  stream_url: string;
  protocol: 'rtsp' | 'rtmp';
  hls_url: string;
  webrtc_url?: string;
  stream_name?: string;
  camera_ip?: string;
  camera_port?: number;
  camera_username?: string;
  camera_channel?: number;
  vendor?: string;
  last_error?: string;
  status: 'online' | 'offline' | 'error';
  resolution: string;
  fps: number;
  bitrate: string;
  last_connected: string;
  created_at?: string;
  updated_at?: string;
}

export interface Sector {
  id: number;
  name: string;
  description: string;
  location: string;
  camera_id: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export interface SectorGroupAssignment {
  id: number;
  sector_id: number;
  group_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface FacialRecognitionRecord {
  id: number;
  person_name: string;
  person_id: string;
  sector_id: number;
  group_id: number;
  confidence: number;
  timestamp: string;
  event_type: 'entry' | 'exit' | 'detection';
  created_at?: string;
  updated_at?: string;
}

// Monitoring Zones
export async function fetchZones(): Promise<MonitoringZone[]> {
  const response = await apiJson<{ items: MonitoringZone[] }>(`/api/v1/entities/monitoring_zones?limit=50`);
  return response.items || [];
}

export async function fetchEvents(limit = 200, skip = 0, query: Record<string, unknown> = {}): Promise<{ items: MonitoringEvent[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    sort: '-timestamp',
    query: JSON.stringify(query),
  });
  const response = await apiJson<{ items: MonitoringEvent[]; total: number }>(
    `/api/v1/entities/monitoring_events?${params.toString()}`
  );
  return { items: response.items || [], total: response.total || 0 };
}

export async function createEvent(data: Omit<MonitoringEvent, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoringEvent> {
  return await apiJson<MonitoringEvent>('/api/v1/entities/monitoring_events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchStreams(): Promise<CameraStream[]> {
  const response = await apiJson<{ items: CameraStream[] }>(`/api/v1/entities/camera_streams?limit=50`);
  return response.items || [];
}

export async function createStream(data: Omit<CameraStream, 'id' | 'created_at' | 'updated_at'>): Promise<CameraStream> {
  return await apiJson<CameraStream>('/api/v1/entities/camera_streams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface AutoOnboardCameraPayload {
  zone_id: number;
  camera_ip: string;
  camera_port: number;
  username: string;
  password: string;
  channel: number;
  vendor_hint?: string;
  stream_name?: string;
  media_server_url: string;
  hls_port: number;
  webrtc_port: number;
  resolution: string;
  fps: number;
  bitrate: string;
}

export async function autoOnboardCamera(payload: AutoOnboardCameraPayload): Promise<CameraStream> {
  return await apiJson<CameraStream>('/api/v1/entities/camera_streams/auto-onboard', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStream(id: number, data: Partial<CameraStream>): Promise<CameraStream> {
  return await apiJson<CameraStream>(`/api/v1/entities/camera_streams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStream(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/camera_streams/${id}`, { method: 'DELETE' });
}

// Sectors
export async function fetchSectors(): Promise<Sector[]> {
  const response = await apiJson<{ items: Sector[] }>(`/api/v1/entities/sectors?limit=100`);
  return response.items || [];
}

export async function createSector(data: Omit<Sector, 'id' | 'created_at' | 'updated_at'>): Promise<Sector> {
  return await apiJson<Sector>('/api/v1/entities/sectors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSector(id: number, data: Partial<Sector>): Promise<Sector> {
  return await apiJson<Sector>(`/api/v1/entities/sectors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSector(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/sectors/${id}`, { method: 'DELETE' });
}

// Environment Groups
export async function fetchGroups(): Promise<EnvironmentGroup[]> {
  const response = await apiJson<{ items: EnvironmentGroup[] }>(`/api/v1/entities/environment_groups?limit=100`);
  return response.items || [];
}

export async function createGroup(data: Omit<EnvironmentGroup, 'id' | 'created_at' | 'updated_at'>): Promise<EnvironmentGroup> {
  return await apiJson<EnvironmentGroup>('/api/v1/entities/environment_groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGroup(id: number, data: Partial<EnvironmentGroup>): Promise<EnvironmentGroup> {
  return await apiJson<EnvironmentGroup>(`/api/v1/entities/environment_groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/environment_groups/${id}`, { method: 'DELETE' });
}

// Sector Group Assignments
export async function fetchSectorGroupAssignments(): Promise<SectorGroupAssignment[]> {
  const response = await apiJson<{ items: SectorGroupAssignment[] }>(
    `/api/v1/entities/sector_group_assignments?limit=200`
  );
  return response.items || [];
}

export async function createSectorGroupAssignment(data: Omit<SectorGroupAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<SectorGroupAssignment> {
  return await apiJson<SectorGroupAssignment>('/api/v1/entities/sector_group_assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSectorGroupAssignment(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/sector_group_assignments/${id}`, { method: 'DELETE' });
}

// Facial Recognition Records
export async function fetchFacialRecords(limit = 500, skip = 0, query: Record<string, unknown> = {}): Promise<{ items: FacialRecognitionRecord[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    sort: '-timestamp',
    query: JSON.stringify(query),
  });
  const response = await apiJson<{ items: FacialRecognitionRecord[]; total: number }>(
    `/api/v1/entities/facial_recognition_records?${params.toString()}`
  );
  return { items: response.items || [], total: response.total || 0 };
}

// Zone CRUD
export async function createZone(data: Omit<MonitoringZone, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoringZone> {
  return await apiJson<MonitoringZone>('/api/v1/entities/monitoring_zones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateZone(id: number, data: Partial<MonitoringZone>): Promise<MonitoringZone> {
  return await apiJson<MonitoringZone>(`/api/v1/entities/monitoring_zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteZone(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/monitoring_zones/${id}`, { method: 'DELETE' });
}

// Facial Recognition CRUD
export async function createFacialRecord(data: Omit<FacialRecognitionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<FacialRecognitionRecord> {
  return await apiJson<FacialRecognitionRecord>('/api/v1/entities/facial_recognition_records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFacialRecord(id: number, data: Partial<FacialRecognitionRecord>): Promise<FacialRecognitionRecord> {
  return await apiJson<FacialRecognitionRecord>(`/api/v1/entities/facial_recognition_records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFacialRecord(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/entities/facial_recognition_records/${id}`, { method: 'DELETE' });
}

// ============================================================
// Media Server Configuration (RTSP → HLS/WebRTC conversion)
// ============================================================

export interface MediaServerConfig {
  serverUrl: string;
  serverType: 'mediamtx' | 'go2rtc' | 'srs' | 'custom';
  hlsEnabled: boolean;
  webrtcEnabled: boolean;
  hlsPort: number;
  webrtcPort: number;
  apiPort: number;
}

/** Generate HLS URL from RTSP URL based on media server config */
export function generateHlsUrl(rtspUrl: string, config: MediaServerConfig): string {
  try {
    if (!rtspUrl.toLowerCase().startsWith('rtsp://')) {
      return '';
    }
    const url = new URL(rtspUrl.replace('rtsp://', 'http://'));
    const pathPart = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, '_') || 'stream';
    const streamName = `cam_${url.hostname.replace(/\./g, '_')}${url.port && url.port !== '554' ? '_' + url.port : ''}_${pathPart}`;
    const serverHostname = new URL(config.serverUrl).hostname;
    const scheme = new URL(config.serverUrl).protocol.replace(':', '') || 'http';

    switch (config.serverType) {
      case 'mediamtx':
        return `${scheme}://${serverHostname}:${config.hlsPort}/${streamName}/index.m3u8`;
      case 'go2rtc':
        return `${scheme}://${serverHostname}:${config.hlsPort}/api/stream.m3u8?src=${streamName}`;
      case 'srs':
        return `${scheme}://${serverHostname}:${config.hlsPort}/live/${streamName}.m3u8`;
      default:
        return `${scheme}://${serverHostname}:${config.hlsPort}/${streamName}/index.m3u8`;
    }
  } catch {
    return '';
  }
}

/** Generate WebRTC WHEP URL from RTSP URL */
export function generateWebRtcUrl(rtspUrl: string, config: MediaServerConfig): string {
  try {
    if (!rtspUrl.toLowerCase().startsWith('rtsp://')) {
      return '';
    }
    const url = new URL(rtspUrl.replace('rtsp://', 'http://'));
    const pathPart = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, '_') || 'stream';
    const streamName = `cam_${url.hostname.replace(/\./g, '_')}${url.port && url.port !== '554' ? '_' + url.port : ''}_${pathPart}`;
    const baseUrl = new URL(config.serverUrl);
    const serverHostname = baseUrl.hostname;
    const scheme = baseUrl.protocol.replace(':', '') || 'http';

    switch (config.serverType) {
      case 'mediamtx':
        // MediaMTX offers a browser-ready WebRTC page at /<streamName>/.
        return `${scheme}://${serverHostname}:${config.webrtcPort}/${streamName}/`;
      case 'go2rtc':
        return `${scheme}://${serverHostname}:${config.webrtcPort}/api/webrtc?src=${streamName}`;
      default:
        return `${scheme}://${serverHostname}:${config.webrtcPort}/${streamName}/whep`;
    }
  } catch {
    return '';
  }
}

/** Save media server config to localStorage */
export function saveMediaServerConfig(config: MediaServerConfig): void {
  localStorage.setItem('mediaServerConfig', JSON.stringify(config));
}

/** Load media server config from localStorage */
export function loadMediaServerConfig(): MediaServerConfig | null {
  const stored = localStorage.getItem('mediaServerConfig');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as MediaServerConfig;
  } catch {
    return null;
  }
}

/** Get default media server config */
export function getDefaultMediaServerConfig(): MediaServerConfig {
  return {
    serverUrl: 'http://localhost:9997',
    serverType: 'mediamtx',
    hlsEnabled: true,
    webrtcEnabled: true,
    hlsPort: 8888,
    webrtcPort: 8889,
    apiPort: 9997,
  };
}

// ============================================================
// Backend Stream Converter API (Edge Functions)
// ============================================================

export interface ConvertStreamResponse {
  camera_stream_id?: number;
  stream_name: string;
  stream_url: string;
  hls_url: string;
  webrtc_url: string;
  server_type: string;
  registration: {
    registered: boolean;
    message: string;
  };
  status: string;
}

export interface BatchConvertResponse {
  total_cameras: number;
  converted: number;
  errors: number;
  results: ConvertStreamResponse[];
  error_details: { camera_stream_id: number; error: string }[];
}

export interface ServerHealthResponse {
  status: string;
  server_type: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface StreamHealthResponse {
  status: string;
  source_ready?: boolean;
  reader_count?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface StreamListResponse {
  status: string;
  streams?: { name: string; [key: string]: unknown }[];
  total?: number;
  message?: string;
}

/** Convert a camera stream (by DB id) via backend edge function */
export async function convertStreamById(
  cameraStreamId: number,
  config: MediaServerConfig,
): Promise<ConvertStreamResponse> {
  return await apiJson<ConvertStreamResponse>('/api/v1/stream-converter/convert', {
    method: 'POST',
    body: JSON.stringify({
      camera_stream_id: cameraStreamId,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    }),
  });
}

/** Convert an RTSP/RTMP URL directly (no DB record needed) */
export async function convertStreamDirect(
  streamUrl: string,
  config: MediaServerConfig,
): Promise<ConvertStreamResponse> {
  return await apiJson<ConvertStreamResponse>('/api/v1/stream-converter/convert-direct', {
    method: 'POST',
    body: JSON.stringify({
      stream_url: streamUrl,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    }),
  });
}

/** Batch-convert all camera streams */
export async function batchConvertStreams(
  config: MediaServerConfig,
): Promise<BatchConvertResponse> {
  return await apiJson<BatchConvertResponse>('/api/v1/stream-converter/batch-convert', {
    method: 'POST',
    body: JSON.stringify({
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    }),
  });
}

/** Check media server health via backend */
export async function checkServerHealth(
  config: MediaServerConfig,
): Promise<ServerHealthResponse> {
  return await apiJson<ServerHealthResponse>('/api/v1/stream-converter/server-health', {
    method: 'POST',
    body: JSON.stringify({
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    }),
  });
}

/** Check a specific stream's health via backend */
export async function checkStreamHealth(
  streamName: string,
  config: MediaServerConfig,
): Promise<StreamHealthResponse> {
  return await apiJson<StreamHealthResponse>('/api/v1/stream-converter/stream-health', {
    method: 'POST',
    body: JSON.stringify({
      stream_name: streamName,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    }),
  });
}

/** List all active streams on the media server via backend */
export async function listMediaServerStreams(
  config: MediaServerConfig,
): Promise<StreamListResponse> {
  return await apiJson<StreamListResponse>('/api/v1/stream-converter/stream-list', {
    method: 'POST',
    body: JSON.stringify({
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    }),
  });
}