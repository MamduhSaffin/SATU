import { useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { TemanRepository } from './repository';
import type { SavedLocation, TravelPlan } from './types';
import './teman-offline-map.css';

type Mode = 'hotel' | 'group';
type Point = { latitude: number; longitude: number; accuracyMeters?: number };

type MapPackManifest = {
  version: 1;
  installedAt: number;
  hotel?: Point & { label: string };
  meetingPoint?: Point & { label: string };
  shellCached: boolean;
};

const MAP_PACK_KEY = 'teman.map.pack.v1';
const MAP_PACK_CACHE = 'teman-map-pack-v1';
const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

export default function OfflineSafetyMapApp() {
  const [mode, setMode] = useState<Mode>('hotel');
  const [travel, setTravel] = useState<TravelPlan>({});
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const [pack, setPack] = useState<MapPackManifest | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');

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
      const [savedTravel, savedLocations, savedPack] = await Promise.all([
        repo.getTravelPlan(),
        repo.getSavedLocations(),
        store.get<MapPackManifest>(MAP_PACK_KEY),
      ]);
      setTravel(savedTravel ?? {});
      setLocations(savedLocations);
      setPack(savedPack ?? null);
    })();
  }, []);

  const hotel = travel.makkahHotel ?? travel.madinahHotel;
  const group = travel.group;

  const hotelPoint = useMemo<Point | null>(() => {
    const saved = locations.find((item) => item.id === 'hotel-makkah')
      ?? locations.find((item) => item.id === 'hotel-madinah');
    if (saved) return saved;
    if (typeof hotel?.latitude === 'number' && typeof hotel?.longitude === 'number') {
      return { latitude: hotel.latitude, longitude: hotel.longitude };
    }
    return pack?.hotel ?? null;
  }, [locations, hotel, pack]);

  const meetingPoint = useMemo<Point | null>(() => {
    const saved = locations.find((item) => item.id === 'meeting-point');
    return saved ?? pack?.meetingPoint ?? null;
  }, [locations, pack]);

  const destination = mode === 'hotel' ? hotelPoint : meetingPoint;
  const destinationLabel = mode === 'hotel'
    ? (hotel?.name || pack?.hotel?.label || 'Hotel')
    : (group?.meetingPoint || pack?.meetingPoint?.label || 'Tempat berkumpul');

  const distance = current && destination ? distanceMeters(current, destination) : null;
  const bearing = current && destination ? bearingDegrees(current, destination) : null;

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setMessage('GPS tidak tersedia pada peranti ini.');
      return;
    }
    setLocating(true);
    setMessage('Mencari lokasi semasa…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrent({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setMessage(`Lokasi ditemui • ketepatan ±${Math.round(position.coords.accuracy)} m.`);
        setLocating(false);
      },
      (error) => {
        setMessage(`GPS tidak dapat digunakan: ${error.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  async function installSafetyMapPack() {
    if (!hotelPoint && !meetingPoint) {
      setMessage('Simpan lokasi hotel atau tempat berkumpul dahulu sebelum memasang pek offline.');
      return;
    }
    setInstalling(true);
    setMessage('Menyediakan pek keselamatan offline…');

    let shellCached = false;
    try {
      if ('caches' in window) {
        const cache = await caches.open(MAP_PACK_CACHE);
        await cache.addAll([
          '/',
          '/?app=teman',
          '/?app=teman-map',
          '/?app=teman-nav',
          '/manifest.webmanifest',
        ]);
        shellCached = true;
      }
    } catch {
      shellCached = false;
    }

    const next: MapPackManifest = {
      version: 1,
      installedAt: Date.now(),
      hotel: hotelPoint ? { ...hotelPoint, label: hotel?.name || 'Hotel' } : undefined,
      meetingPoint: meetingPoint ? { ...meetingPoint, label: group?.meetingPoint || 'Tempat berkumpul' } : undefined,
      shellCached,
    };

    await store.set(MAP_PACK_KEY, next);
    await repo.updateOfflineAssets({ offlineMap: true });
    setPack(next);
    setInstalling(false);
    setMessage(shellCached
      ? 'Pek Peta Keselamatan dipasang. Koordinat, arah, jarak dan skrin penting disimpan untuk penggunaan offline.'
      : 'Data lokasi offline telah disimpan. Cache skrin tidak dapat disahkan pada pelayar ini.');
  }

  async function copyDestination() {
    if (!destination) {
      setMessage('Destinasi belum mempunyai koordinat.');
      return;
    }
    const value = `${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Koordinat disalin: ${value}`);
    } catch {
      setMessage(`Koordinat destinasi: ${value}`);
    }
  }

  return <main className="offline-map-app">
    <header className="offline-map-header">
      <div>
        <strong>TEMAN Haramain</strong>
        <span>Peta Keselamatan Offline • by TGPU</span>
      </div>
      <span className={online ? 'map-online' : 'map-offline'}>{online ? 'Online' : 'Offline'}</span>
    </header>

    <button className="map-back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

    <section className="offline-map-content">
      <div className="map-title-block">
        <span className="map-eyebrow">OFFLINE SAFETY MAP</span>
        <h1>Cari arah walaupun tiada internet</h1>
        <p>GPS telefon, lokasi tersimpan, jarak lurus dan arah kompas matematik boleh digunakan tanpa data mudah alih.</p>
      </div>

      <div className="map-mode-grid">
        <button className={mode === 'hotel' ? 'active' : ''} onClick={() => { setMode('hotel'); setMessage(''); }}>
          HOTEL
          <span>{hotel?.name || 'Lokasi hotel'}</span>
        </button>
        <button className={mode === 'group' ? 'active' : ''} onClick={() => { setMode('group'); setMessage(''); }}>
          KUMPULAN
          <span>{group?.meetingPoint || 'Tempat berkumpul'}</span>
        </button>
      </div>

      <div className="map-stage" aria-label="Peta arah offline">
        <div className="compass-ring">
          <span className="north">U</span>
          <span className="east">T</span>
          <span className="south">S</span>
          <span className="west">B</span>
          <div className="user-dot">ANDA</div>
          {bearing !== null && <div className="bearing-arrow" style={{ transform: `translate(-50%, -100%) rotate(${bearing}deg)` }}>
            <span>▲</span>
          </div>}
        </div>
        <div className="map-destination-label">
          <strong>{destinationLabel}</strong>
          {destination
            ? <span>{destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}</span>
            : <span>Koordinat belum disimpan</span>}
        </div>
      </div>

      <button className="map-primary" onClick={locateMe} disabled={locating || !destination}>
        {locating ? 'MENCARI GPS…' : 'GUNA GPS SAYA SEKARANG'}
      </button>

      {distance !== null && bearing !== null && <div className="map-guidance-card">
        <div>
          <span>JARAK LURUS</span>
          <strong>{formatDistance(distance)}</strong>
        </div>
        <div>
          <span>ARAH DARI UTARA</span>
          <strong>{Math.round(bearing)}° {cardinalDirection(bearing)}</strong>
        </div>
        {current?.accuracyMeters && <small>Ketepatan GPS ±{Math.round(current.accuracyMeters)} m</small>}
        <p>Ini panduan arah lurus, bukan laluan berjalan. Jangan ikut anak panah merentasi bangunan, jalan tertutup atau kawasan larangan.</p>
      </div>}

      <div className="map-action-grid">
        <button onClick={() => void copyDestination()}>SALIN KOORDINAT</button>
        <button onClick={() => { window.location.href = '/?app=teman-nav'; }}>BUTIRAN LOKASI</button>
      </div>

      <div className={pack ? 'map-pack-card installed' : 'map-pack-card'}>
        <div>
          <span>PEK PETA KESELAMATAN</span>
          <strong>{pack ? 'DIPASANG ✓' : 'BELUM DIPASANG'}</strong>
        </div>
        <p>Pek ini menyimpan titik hotel/kumpulan dan skrin keselamatan untuk kegunaan offline. Ia belum mengandungi jalan atau turn-by-turn routing.</p>
        {pack && <small>Dipasang: {new Date(pack.installedAt).toLocaleString('ms-MY')}</small>}
        <button onClick={() => void installSafetyMapPack()} disabled={installing}>
          {installing ? 'MEMASANG…' : pack ? 'KEMAS KINI PEK OFFLINE' : 'PASANG PEK OFFLINE'}
        </button>
      </div>

      {message && <div className="map-message">{message}</div>}

      <div className="map-safety-note">
        <strong>Apa yang benar-benar offline?</strong>
        <p>Lokasi yang telah disimpan, GPS semasa, arah, jarak, Safety Card dan maklumat kumpulan. Peta jalan terperinci akan menggunakan pek PMTiles yang dilesenkan dengan betul dalam lapisan seterusnya.</p>
      </div>
    </section>
  </main>;
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
