import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { TemanRepository } from './repository';
import type { SavedLocation, TravelPlan } from './types';
import 'maplibre-gl/dist/maplibre-gl.css';
import './teman-street-map.css';

type City = 'makkah' | 'madinah';
type Point = { latitude: number; longitude: number };

type PackConfig = {
  label: string;
  arabic: string;
  path: string;
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
    center: [39.8262, 21.4225],
    bounds: [[39.7600, 21.3600], [39.9000, 21.4900]],
  },
  madinah: {
    label: 'Madinah',
    arabic: 'المدينة المنورة',
    path: '/maps/madinah.pmtiles',
    center: [39.6111, 24.4672],
    bounds: [[39.5400, 24.4000], [39.6800, 24.5300]],
  },
};

export default function StreetMapApp() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [city, setCity] = useState<City>('makkah');
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

      const likelyMadinah = savedLocations.some((item) => item.id === 'hotel-madinah')
        || Boolean(savedTravel?.madinahHotel?.latitude && !savedTravel?.makkahHotel?.latitude);
      if (likelyMadinah) setCity('madinah');
      await refreshPackStatus();
      await refreshStorageEstimate();
    })();
  }, []);

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
      maxZoom: 15,
      maxBounds: pack.bounds,
      attributionControl: false,
      style: buildOfflineStyle(`pmtiles://${archiveUrl}`),
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap contributors · Protomaps' }), 'bottom-right');
    map.on('error', (event) => {
      const detail = event.error instanceof Error ? event.error.message : 'Peta tidak dapat dimuatkan.';
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
  }, [city, online, cached[city]]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    destinationPoints.forEach(({ label, point, kind }) => {
      const element = document.createElement('div');
      element.className = `street-marker ${kind}`;
      element.textContent = kind === 'hotel' ? 'H' : 'K';
      element.title = label;
      const marker = new maplibregl.Marker({ element })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(label))
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (current) {
      const element = document.createElement('div');
      element.className = 'street-marker user';
      element.textContent = '●';
      element.title = 'Lokasi anda';
      const marker = new maplibregl.Marker({ element })
        .setLngLat([current.longitude, current.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [destinationPoints, current]);

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
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.byteLength;
            if (total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
          }
        }
      } else {
        const buffer = new Uint8Array(await response.arrayBuffer());
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
        mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 15 });
        setMessage(`Lokasi anda ditemui • ketepatan ±${Math.round(position.coords.accuracy)} m.`);
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
        <span>Peta Jalan Offline • MapLibre + PMTiles</span>
      </div>
      <span className={online ? 'street-online' : 'street-offline'}>{online ? 'Online' : 'Offline'}</span>
    </header>

    <section className="street-map-toolbar">
      <button onClick={() => { window.location.href = '/?app=teman'; }}>← TEMAN</button>
      <button onClick={() => { window.location.href = '/?app=teman-map'; }}>Peta Kompas</button>
    </section>

    <section className="street-map-content">
      <div className="street-map-intro">
        <span>SELF-HOSTED HARAMAIN MAP</span>
        <h1>Jalan sebenar, tanpa API key</h1>
        <p>Peta vektor ini datang daripada OpenStreetMap melalui PMTiles yang dihoskan oleh TGPU. Muat turun sekali sebelum perjalanan; selepas itu jalan, bangunan dan air boleh dipaparkan tanpa internet.</p>
      </div>

      <div className="street-city-tabs">
        {(Object.keys(PACKS) as City[]).map((key) => <button key={key} className={city === key ? 'active' : ''} onClick={() => { setCity(key); setMessage(''); }}>
          <strong>{PACKS[key].label}</strong>
          <span dir="rtl">{PACKS[key].arabic}</span>
          <small>{cached[key] ? 'OFFLINE ✓' : 'Belum dimuat turun'}</small>
        </button>)}
      </div>

      <div className="street-pack-panel">
        <div>
          <span>PEK {pack.label.toUpperCase()}</span>
          <strong>{cached[city] ? 'TERSIMPAN OFFLINE ✓' : online ? 'SEDIA UNTUK DIMUAT TURUN' : 'BELUM ADA OFFLINE'}</strong>
          {storageText && <small>{storageText}</small>}
        </div>
        <div className="street-pack-actions">
          <button className="download" onClick={() => void downloadOfflinePack()} disabled={downloading || cached[city]}>
            {downloading ? `MEMUAT TURUN${progress !== null ? ` ${progress}%` : '…'}` : cached[city] ? 'SUDAH DIMUAT TURUN' : 'MUAT TURUN PETA OFFLINE'}
          </button>
          {cached[city] && <button className="remove" onClick={() => void removeOfflinePack()}>BUANG PEK</button>}
        </div>
        {downloading && <div className="street-progress"><div style={{ width: `${progress ?? 8}%` }} /></div>}
      </div>

      <div className="street-map-frame">
        {canRender
          ? <div ref={mapContainer} className="street-map-canvas" />
          : <div className="street-map-empty">
            <strong>Peta {pack.label} belum berada pada telefon.</strong>
            <p>Sambung internet sekali, muat turun pek, kemudian cuba semula dalam Airplane Mode.</p>
            <button onClick={() => { window.location.href = '/?app=teman-map'; }}>GUNA PETA KOMPAS OFFLINE</button>
          </div>}
      </div>

      <div className="street-map-actions">
        <button className="gps" onClick={locateMe}>GPS SAYA SEKARANG</button>
        <button onClick={() => { window.location.href = '/?app=teman-nav'; }}>HOTEL / KUMPULAN</button>
      </div>

      {message && <div className="street-message">{message}</div>}

      <div className="street-safety-note">
        <strong>Penting untuk keselamatan</strong>
        <p>Peta jalan membantu orientasi, tetapi TEMAN v0.5 belum mengira turn-by-turn walking route. Jika anda sesat, gunakan juga Safety Card, mutawwif, Peta Kompas dan bantuan petugas. Jangan pilih laluan hanya kerana satu jalan kelihatan dekat pada peta.</p>
      </div>

      <div className="street-attribution">
        Map data © OpenStreetMap contributors • PMTiles / Protomaps • Rendered with MapLibre GL JS
      </div>
    </section>
  </main>;
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
      { id: 'roads-path', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'path'], paint: { 'line-color': '#d9cdbb', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 15, 1.6] } },
      { id: 'roads-minor', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'minor_road'], paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 15, 3.5] } },
      { id: 'roads-major-casing', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['match', ['get', 'kind'], ['major_road', 'highway'], true, false], paint: { 'line-color': '#d7b989', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 15, 6.5] } },
      { id: 'roads-major', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['match', ['get', 'kind'], ['major_road', 'highway'], true, false], paint: { 'line-color': '#fff6df', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 15, 4.5] } },
      { id: 'rail', type: 'line', source: 'haramain', 'source-layer': 'roads', filter: ['==', ['get', 'kind'], 'rail'], paint: { 'line-color': '#a5a0a0', 'line-width': 1.2, 'line-dasharray': [2, 2] } },
    ],
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
