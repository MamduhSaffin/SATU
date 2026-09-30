import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { TemanRepository } from './repository';
import type { SavedLocation, TravelPlan } from './types';
import 'maplibre-gl/dist/maplibre-gl.css';
import './teman-street-map.css';

type City = 'makkah' | 'madinah';
type TargetMode = 'overview' | 'hotel' | 'group';
type Point = { latitude: number; longitude: number };

type PackConfig = {
  label: string;
  arabic: string;
  path: string;
  approxSize: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
};

const PACK_CACHE = 'teman-pmtiles-v1';
const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

const PACKS: Record<City, PackConfig> = {
  makkah: {
    label: 'Makkah',
    arabic: 'مكة المكرمة',
    path: '/maps/makkah.pmtiles',
    approxSize: '±2.4 MB',
    center: [39.8262, 21.4225],
    bounds: [[39.7600, 21.3600], [39.9000, 21.4900]],
  },
  madinah: {
    label: 'Madinah',
    arabic: 'المدينة المنورة',
    path: '/maps/madinah.pmtiles',
    approxSize: '±2.2 MB',
    center: [39.6111, 24.4672],
    bounds: [[39.5400, 24.4000], [39.6800, 24.5300]],
  },
};

export default function StreetMapApp() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedTarget = params.get('target');
  const initialTarget: TargetMode = requestedTarget === 'hotel' || requestedTarget === 'group' ? requestedTarget : 'overview';
  const requestedCity = params.get('city');
  const initialCity: City = requestedCity === 'madinah' ? 'madinah' : 'makkah';

  const [city, setCity] = useState<City>(initialCity);
  const [targetMode, setTargetMode] = useState<TargetMode>(initialTarget);
  const [travel, setTravel] = useState<TravelPlan>({});
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [cached, setCached] = useState<Record<City, boolean>>({ makkah: false, madinah: false });
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [storageText, setStorageText] = useState('');
  const pack = PACKS[city];

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [savedTravel, savedLocations] = await Promise.all([
        repo.getTravelPlan(),
        repo.getSavedLocations(),
      ]);
      setTravel(savedTravel ?? {});
      setLocations(savedLocations);

      if (requestedCity !== 'makkah' && requestedCity !== 'madinah') {
        const likelyMadinah = savedLocations.some((item) => item.id === 'hotel-madinah')
          || Boolean(savedTravel?.madinahHotel?.latitude && !savedTravel?.makkahHotel?.latitude);
        if (likelyMadinah) setCity('madinah');
      }
      await refreshPackStatus();
      await refreshStorageEstimate();
    })();
  }, [requestedCity]);

  async function refreshPackStatus() {
    if (!('caches' in window)) return;
    const cache = await caches.open(PACK_CACHE);
    const [makkah, madinah] = await Promise.all([
      cache.match(PACKS.makkah.path),
      cache.match(PACKS.madinah.path),
    ]);
    setCached({ makkah: Boolean(makkah), madinah: Boolean(madinah) });
  }

  async function refreshStorageEstimate() {
    if (!navigator.storage?.estimate) return;
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.usage === 'number' && typeof estimate.quota === 'number') {
      setStorageText(`${formatBytes(estimate.usage)} digunakan daripada ${formatBytes(estimate.quota)}`);
    }
  }

  const destinationPoints = useMemo(() => {
    const points: Array<{ label: string; point: Point; kind: 'hotel' | 'group' }> = [];
    const makkahHotel = locations.find((item) => item.id === 'hotel-makkah');
    const madinahHotel = locations.find((item) => item.id === 'hotel-madinah');
    const meeting = locations.find((item) => item.id === 'meeting-point');

    if (city === 'makkah') {
      const hotel = makkahHotel ?? coordinateFromHotel(travel.makkahHotel);
      if (hotel) points.push({ label: travel.makkahHotel?.name || 'Hotel Makkah', point: hotel, kind: 'hotel' });
    } else {
      const hotel = madinahHotel ?? coordinateFromHotel(travel.madinahHotel);
      if (hotel) points.push({ label: travel.madinahHotel?.name || 'Hotel Madinah', point: hotel, kind: 'hotel' });
    }

    if (meeting && pointInsideBounds(meeting, pack.bounds)) {
      points.push({ label: travel.group?.meetingPoint || 'Tempat berkumpul', point: meeting, kind: 'group' });
    }
    return points;
  }, [city, locations, travel, pack.bounds]);

  const hotelDestination = destinationPoints.find((item) => item.kind === 'hotel') ?? null;
  const groupDestination = destinationPoints.find((item) => item.kind === 'group') ?? null;
  const activeDestination = targetMode === 'hotel'
    ? hotelDestination
    : targetMode === 'group'
      ? groupDestination
      : null;
  const activeDistance = current && activeDestination ? distanceMeters(current, activeDestination.point) : null;
  const activeBearing = current && activeDestination ? bearingDegrees(current, activeDestination.point) : null;

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!online && !cached[city]) {
      mapRef.current?.remove();
      mapRef.current = null;
      return;
    }

    const protocol = new Protocol({ metadata: true });
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const archiveUrl = new URL(pack.path, window.location.origin).toString();
    const map = new maplibregl.Map({
      container: mapContainer.current,
      center: pack.center,
      zoom: 14,
      minZoom: 11,
      maxZoom: 16,
      maxBounds: pack.bounds,
      attributionControl: false,
      style: buildOfflineStyle(`pmtiles://${archiveUrl}`),
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap contributors · Protomaps' }), 'bottom-right');
    map.on('load', () => {
      if (activeDestination) {
        map.flyTo({ center: [activeDestination.point.longitude, activeDestination.point.latitude], zoom: 15 });
      }
    });
    map.on('error', (event: any) => {
      const detail = event?.error instanceof Error ? event.error.message : 'Peta tidak dapat dimuatkan.';
      setMessage(`Peta jalan: ${detail}`);
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      maplibregl.removeProtocol('pmtiles');
    };
  }, [city, online, cached[city], pack]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    destinationPoints.forEach(({ label, point, kind }) => {
      const element = createMarker(kind === 'hotel' ? 'HOTEL' : 'KUMPULAN', kind);
      element.title = label;
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(new maplibregl.Popup({ offset: 30 }).setText(label))
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (current) {
      const element = createMarker('ANDA', 'user');
      element.title = 'Lokasi anda';
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([current.longitude, current.latitude])
        .setPopup(new maplibregl.Popup({ offset: 30 }).setText('Lokasi anda sekarang'))
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [destinationPoints, current]);

  useEffect(() => {
    if (!activeDestination || !mapRef.current) return;
    mapRef.current.flyTo({ center: [activeDestination.point.longitude, activeDestination.point.latitude], zoom: 15 });
  }, [targetMode, activeDestination]);

  async function downloadOfflinePack() {
    if (!online) {
      setMessage('Sambungkan internet dahulu untuk memuat turun pek bandar. Selepas itu peta boleh dibuka offline.');
      return;
    }
    if (!('caches' in window)) {
      setMessage('Pelayar ini tidak menyokong Cache Storage untuk pek peta offline.');
      return;
    }

    setDownloading(true);
    setProgress(0);
    setMessage(`Memuat turun Peta ${pack.label}…`);

    try {
      const response = await fetch(pack.path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get('content-length') || 0);
      const reader = response.body?.getReader();
      const chunks: ArrayBuffer[] = [];
      let loaded = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const copy = new Uint8Array(value.byteLength);
            copy.set(value);
            chunks.push(copy.buffer);
            loaded += value.byteLength;
            if (total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
          }
        }
      } else {
        const buffer = await response.arrayBuffer();
        chunks.push(buffer);
        loaded = buffer.byteLength;
      }

      const blob = new Blob(chunks, { type: 'application/vnd.pmtiles' });
      const cache = await caches.open(PACK_CACHE);
      await cache.put(pack.path, new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.pmtiles',
          'Content-Length': String(blob.size),
          'Accept-Ranges': 'bytes',
          'X-TEMAN-Offline-Pack': city,
        },
      }));
      await repo.updateOfflineAssets({ offlineMap: true });
      await refreshPackStatus();
      await refreshStorageEstimate();
      setProgress(100);
      setMessage(`Peta ${pack.label} disimpan pada telefon (${formatBytes(loaded)}). Anda boleh uji semula dalam Airplane Mode.`);
    } catch (error) {
      setMessage(`Muat turun gagal: ${error instanceof Error ? error.message : 'ralat tidak diketahui'}`);
    } finally {
      setDownloading(false);
    }
  }

  async function removeOfflinePack() {
    if (!('caches' in window)) return;
    const cache = await caches.open(PACK_CACHE);
    await cache.delete(pack.path);
    await refreshPackStatus();
    await refreshStorageEstimate();
    setMessage(`Peta ${pack.label} telah dibuang daripada simpanan offline.`);
  }

  function chooseTarget(target: Exclude<TargetMode, 'overview'>) {
    setTargetMode(target);
    setMessage(target === 'hotel' ? 'Hotel dipilih. Tekan “DI MANA SAYA?” untuk melihat jarak dari lokasi anda.' : 'Tempat kumpulan dipilih. Tekan “DI MANA SAYA?” untuk melihat jarak dari lokasi anda.');
  }

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setMessage('GPS tidak tersedia pada peranti ini.');
      return;
    }
    setMessage('Mencari lokasi GPS…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrent(next);
        if (activeDestination && mapRef.current) {
          const bounds = new maplibregl.LngLatBounds();
          bounds.extend([next.longitude, next.latitude]);
          bounds.extend([activeDestination.point.longitude, activeDestination.point.latitude]);
          mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 15 });
        } else {
          mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 15 });
        }
        setMessage(`ANDA ditemui • ketepatan GPS ±${Math.round(position.coords.accuracy)} m.`);
      },
      (error) => setMessage(`GPS tidak dapat digunakan: ${error.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  const canRender = online || cached[city];

  return <main className="street-map-app">
    <header className="street-map-header">
      <div>
        <strong>TEMAN Haramain</strong>
        <span>Peta Jalan Offline • Mudah untuk jemaah</span>
      </div>
      <span className={online ? 'street-online' : 'street-offline'}>{online ? 'Online' : 'Offline ✓'}</span>
    </header>

    <section className="street-map-toolbar">
      <button onClick={() => { window.location.href = '/?app=teman'; }}>← TEMAN</button>
      <button onClick={() => { window.location.href = '/?app=teman-map'; }}>PETA KOMPAS</button>
    </section>

    <section className="street-map-content">
      <div className="street-map-intro elderly-intro">
        <span>PETA HARAMAIN</span>
        <h1>Anda mahu pergi ke mana?</h1>
        <p>Pilih satu butang besar. TEMAN akan tunjuk ANDA, HOTEL dan KUMPULAN dengan jelas.</p>
      </div>

      <div className="street-elder-actions">
        <button className={targetMode === 'hotel' ? 'hotel active' : 'hotel'} onClick={() => chooseTarget('hotel')}>
          <strong>BALIK KE HOTEL</strong>
          <span>{hotelDestination?.label || 'Lokasi hotel belum disimpan'}</span>
        </button>
        <button className={targetMode === 'group' ? 'group active' : 'group'} onClick={() => chooseTarget('group')}>
          <strong>CARI KUMPULAN</strong>
          <span>{groupDestination?.label || 'Tempat berkumpul belum disimpan'}</span>
        </button>
        <button className="me" onClick={locateMe}>
          <strong>DI MANA SAYA?</strong>
          <span>Guna GPS telefon sekarang</span>
        </button>
      </div>

      {activeDestination && <div className="street-destination-banner">
        <span>DESTINASI DIPILIH</span>
        <strong>{targetMode === 'hotel' ? 'HOTEL' : 'KUMPULAN'} • {activeDestination.label}</strong>
        {activeDistance !== null && activeBearing !== null && <div className="street-distance-summary">
          <b>{formatDistance(activeDistance)}</b>
          <b>{Math.round(activeBearing)}° {cardinalDirection(activeBearing)}</b>
          <small>Jarak lurus dan arah kompas — bukan turn-by-turn.</small>
        </div>}
      </div>}

      <div className="street-city-tabs">
        {(Object.keys(PACKS) as City[]).map((key) => <button key={key} className={city === key ? 'active' : ''} onClick={() => { setCity(key); setTargetMode('overview'); setMessage(''); }}>
          <strong>{PACKS[key].label}</strong>
          <span dir="rtl">{PACKS[key].arabic}</span>
          <small>{cached[key] ? 'PETA OFFLINE SIAP ✓' : `Perlu muat turun ${PACKS[key].approxSize}`}</small>
        </button>)}
      </div>

      <div className={cached[city] ? 'street-pack-panel ready' : 'street-pack-panel'}>
        <div>
          <span>STATUS PETA {pack.label.toUpperCase()}</span>
          <strong>{cached[city] ? 'SIAP DIGUNA TANPA INTERNET ✓' : online ? 'BELUM DISIMPAN OFFLINE' : 'TIADA PETA OFFLINE'}</strong>
          <small>{cached[city] ? 'Jalan dan bangunan bandar ini sudah berada pada telefon.' : `Muat turun sekali sahaja • ${pack.approxSize}`}</small>
          {storageText && <small>{storageText}</small>}
        </div>
        <div className="street-pack-actions">
          <button className="download" onClick={() => void downloadOfflinePack()} disabled={downloading || cached[city]}>
            {downloading ? `MEMUAT TURUN${progress !== null ? ` ${progress}%` : '…'}` : cached[city] ? `PETA ${pack.label.toUpperCase()} SUDAH SIAP` : `MUAT TURUN PETA ${pack.label.toUpperCase()}`}
          </button>
          {cached[city] && <button className="remove" onClick={() => void removeOfflinePack()}>BUANG PEK</button>}
        </div>
        {downloading && <div className="street-progress"><div style={{ width: `${progress ?? 8}%` }} /></div>}
      </div>

      <div className="street-map-legend" aria-label="Petunjuk peta">
        <span className="legend-user">ANDA</span>
        <span className="legend-hotel">HOTEL</span>
        <span className="legend-group">KUMPULAN</span>
      </div>

      <div className="street-map-frame">
        {canRender
          ? <div ref={mapContainer} className="street-map-canvas" />
          : <div className="street-map-empty">
            <strong>Peta {pack.label} belum berada pada telefon.</strong>
            <p>Jika ada internet, muat turun pek di atas. Jika tiada internet, gunakan Peta Kompas yang tetap berfungsi dengan GPS dan koordinat tersimpan.</p>
            <button onClick={() => { window.location.href = '/?app=teman-map'; }}>GUNA PETA KOMPAS OFFLINE</button>
          </div>}
      </div>

      <div className="street-map-actions">
        <button className="gps" onClick={locateMe}>DI MANA SAYA?</button>
        <button onClick={() => { window.location.href = '/?app=teman-nav'; }}>HOTEL / KUMPULAN</button>
      </div>

      {message && <div className="street-message">{message}</div>}

      <div className="street-safety-note">
        <strong>Penting untuk keselamatan</strong>
        <p>Peta jalan membantu anda mengenal jalan dan bangunan, tetapi TEMAN belum mengira laluan berjalan turn-by-turn. Jika anda keliru, jangan ikut jalan semata-mata kerana nampak dekat. Gunakan Safety Card, hubungi mutawwif atau minta bantuan petugas.</p>
      </div>

      <div className="street-attribution">
        Map data © OpenStreetMap contributors • PMTiles / Protomaps • Rendered with MapLibre GL JS
      </div>
    </section>
  </main>;
}

function createMarker(label: string, kind: 'hotel' | 'group' | 'user'): HTMLDivElement {
  const element = document.createElement('div');
  element.className = `street-marker-badge ${kind}`;
  const dot = document.createElement('span');
  dot.className = 'street-marker-dot';
  const text = document.createElement('strong');
  text.textContent = label;
  element.append(dot, text);
  return element;
}

function coordinateFromHotel(hotel?: { latitude?: number; longitude?: number }): Point | null {
  if (typeof hotel?.latitude !== 'number' || typeof hotel.longitude !== 'number') return null;
  return { latitude: hotel.latitude, longitude: hotel.longitude };
}

function pointInsideBounds(point: Point, bounds: PackConfig['bounds']): boolean {
  return point.longitude >= bounds[0][0]
    && point.longitude <= bounds[1][0]
    && point.latitude >= bounds[0][1]
    && point.latitude <= bounds[1][1];
}

function distanceMeters(a: Point, b: Point): number {
  const radius = 6371000;
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLat = radians(b.latitude - a.latitude);
  const deltaLng = radians(b.longitude - a.longitude);
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDegrees(a: Point, b: Point): number {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLng = radians(b.longitude - a.longitude);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function degrees(value: number): number {
  return value * 180 / Math.PI;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function cardinalDirection(value: number): string {
  const directions = ['U', 'UT', 'T', 'ST', 'S', 'BD', 'B', 'BL'];
  return directions[Math.round(value / 45) % 8];
}

function buildOfflineStyle(url: string): any {
  return {
    version: 8,
    sources: {
      haramain: {
        type: 'vector',
        url,
        attribution: '© OpenStreetMap contributors · Protomaps',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f5f2e9' } },
      { id: 'earth', type: 'fill', source: 'haramain', 'source-layer': 'earth', paint: { 'fill-color': '#f5f2e9' } },
      { id: 'landuse', type: 'fill', source: 'haramain', 'source-layer': 'landuse', paint: { 'fill-color': '#edf0e5', 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'haramain', 'source-layer': 'water', paint: { 'fill-color': '#b9d9ea' } },
      { id: 'buildings', type: 'fill', source: 'haramain', 'source-layer': 'buildings', minzoom: 13, paint: { 'fill-color': '#ddd8cf', 'fill-outline-color': '#c9c2b7' } },
      { id: 'roads-path', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'path'], paint: { 'line-color': '#d9cdbb', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 16, 2.2] } },
      { id: 'roads-minor', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'minor_road'], paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 4.2] } },
      { id: 'roads-major-casing', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['match', ['get', 'kind'], ['major_road', 'highway'], true, false], paint: { 'line-color': '#d7b989', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 7.2] } },
      { id: 'roads-major', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['match', ['get', 'kind'], ['major_road', 'highway'], true, false], paint: { 'line-color': '#fff6df', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 5] } },
      { id: 'rail', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'rail'], paint: { 'line-color': '#a5a0a0', 'line-width': 1.2, 'line-dasharray': [2, 2] } },
    ],
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
