import { createClient } from '@metagptx/web-sdk';

export const client = createClient();

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
  const response = await client.entities.monitoring_zones.query({
    query: {},
    limit: 50,
  });
  return response.data.items || [];
}

export async function fetchEvents(limit = 200, skip = 0, query: Record<string, unknown> = {}): Promise<{ items: MonitoringEvent[]; total: number }> {
  const response = await client.entities.monitoring_events.query({
    query,
    sort: '-timestamp',
    limit,
    skip,
  });
  return { items: response.data.items || [], total: response.data.total || 0 };
}

export async function createEvent(data: Omit<MonitoringEvent, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoringEvent> {
  const response = await client.entities.monitoring_events.create({ data });
  return response.data;
}

export async function fetchStreams(): Promise<CameraStream[]> {
  const response = await client.entities.camera_streams.query({
    query: {},
    limit: 50,
  });
  return response.data.items || [];
}

export async function createStream(data: Omit<CameraStream, 'id' | 'created_at' | 'updated_at'>): Promise<CameraStream> {
  const response = await client.entities.camera_streams.create({ data });
  return response.data;
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
  const response = await client.apiCall.invoke({
    url: '/api/v1/entities/camera_streams/auto-onboard',
    method: 'POST',
    data: payload,
  });
  return response.data;
}

export async function updateStream(id: number, data: Partial<CameraStream>): Promise<CameraStream> {
  const response = await client.entities.camera_streams.update({ id, data });
  return response.data;
}

export async function deleteStream(id: number): Promise<void> {
  await client.entities.camera_streams.delete({ id });
}

// Sectors
export async function fetchSectors(): Promise<Sector[]> {
  const response = await client.entities.sectors.query({
    query: {},
    limit: 100,
  });
  return response.data.items || [];
}

export async function createSector(data: Omit<Sector, 'id' | 'created_at' | 'updated_at'>): Promise<Sector> {
  const response = await client.entities.sectors.create({ data });
  return response.data;
}

export async function updateSector(id: number, data: Partial<Sector>): Promise<Sector> {
  const response = await client.entities.sectors.update({ id, data });
  return response.data;
}

export async function deleteSector(id: number): Promise<void> {
  await client.entities.sectors.delete({ id });
}

// Environment Groups
export async function fetchGroups(): Promise<EnvironmentGroup[]> {
  const response = await client.entities.environment_groups.query({
    query: {},
    limit: 100,
  });
  return response.data.items || [];
}

export async function createGroup(data: Omit<EnvironmentGroup, 'id' | 'created_at' | 'updated_at'>): Promise<EnvironmentGroup> {
  const response = await client.entities.environment_groups.create({ data });
  return response.data;
}

export async function updateGroup(id: number, data: Partial<EnvironmentGroup>): Promise<EnvironmentGroup> {
  const response = await client.entities.environment_groups.update({ id, data });
  return response.data;
}

export async function deleteGroup(id: number): Promise<void> {
  await client.entities.environment_groups.delete({ id });
}

// Sector Group Assignments
export async function fetchSectorGroupAssignments(): Promise<SectorGroupAssignment[]> {
  const response = await client.entities.sector_group_assignments.query({
    query: {},
    limit: 200,
  });
  return response.data.items || [];
}

export async function createSectorGroupAssignment(data: Omit<SectorGroupAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<SectorGroupAssignment> {
  const response = await client.entities.sector_group_assignments.create({ data });
  return response.data;
}

export async function deleteSectorGroupAssignment(id: number): Promise<void> {
  await client.entities.sector_group_assignments.delete({ id });
}

// Facial Recognition Records
export async function fetchFacialRecords(limit = 500, skip = 0, query: Record<string, unknown> = {}): Promise<{ items: FacialRecognitionRecord[]; total: number }> {
  const response = await client.entities.facial_recognition_records.query({
    query,
    sort: '-timestamp',
    limit,
    skip,
  });
  return { items: response.data.items || [], total: response.data.total || 0 };
}

// Zone CRUD
export async function createZone(data: Omit<MonitoringZone, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoringZone> {
  const response = await client.entities.monitoring_zones.create({ data });
  return response.data;
}

export async function updateZone(id: number, data: Partial<MonitoringZone>): Promise<MonitoringZone> {
  const response = await client.entities.monitoring_zones.update({ id, data });
  return response.data;
}

export async function deleteZone(id: number): Promise<void> {
  await client.entities.monitoring_zones.delete({ id });
}

// Facial Recognition CRUD
export async function createFacialRecord(data: Omit<FacialRecognitionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<FacialRecognitionRecord> {
  const response = await client.entities.facial_recognition_records.create({ data });
  return response.data;
}

export async function updateFacialRecord(id: number, data: Partial<FacialRecognitionRecord>): Promise<FacialRecognitionRecord> {
  const response = await client.entities.facial_recognition_records.update({ id, data });
  return response.data;
}

export async function deleteFacialRecord(id: number): Promise<void> {
  await client.entities.facial_recognition_records.delete({ id });
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
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/convert',
    method: 'POST',
    data: {
      camera_stream_id: cameraStreamId,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    },
  });
  return response.data;
}

/** Convert an RTSP/RTMP URL directly (no DB record needed) */
export async function convertStreamDirect(
  streamUrl: string,
  config: MediaServerConfig,
): Promise<ConvertStreamResponse> {
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/convert-direct',
    method: 'POST',
    data: {
      stream_url: streamUrl,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    },
  });
  return response.data;
}

/** Batch-convert all camera streams */
export async function batchConvertStreams(
  config: MediaServerConfig,
): Promise<BatchConvertResponse> {
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/batch-convert',
    method: 'POST',
    data: {
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      hls_port: config.hlsPort,
      webrtc_port: config.webrtcPort,
      server_type: config.serverType,
    },
  });
  return response.data;
}

/** Check media server health via backend */
export async function checkServerHealth(
  config: MediaServerConfig,
): Promise<ServerHealthResponse> {
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/server-health',
    method: 'POST',
    data: {
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    },
  });
  return response.data;
}

/** Check a specific stream's health via backend */
export async function checkStreamHealth(
  streamName: string,
  config: MediaServerConfig,
): Promise<StreamHealthResponse> {
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/stream-health',
    method: 'POST',
    data: {
      stream_name: streamName,
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    },
  });
  return response.data;
}

/** List all active streams on the media server via backend */
export async function listMediaServerStreams(
  config: MediaServerConfig,
): Promise<StreamListResponse> {
  const response = await client.apiCall.invoke({
    url: '/api/v1/stream-converter/stream-list',
    method: 'POST',
    data: {
      media_server_url: `http://${new URL(config.serverUrl).hostname}:${config.apiPort}`,
      server_type: config.serverType,
    },
  });
  return response.data;
}