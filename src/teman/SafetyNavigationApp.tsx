import { useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { TemanRepository } from './repository';
import type { EmergencyContact, SavedLocation, TravelPlan } from './types';
import './teman-navigation.css';

type Mode = 'hotel' | 'group';
type Point = { latitude: number; longitude: number; accuracyMeters?: number };

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

export default function SafetyNavigationApp() {
  const [mode, setMode] = useState<Mode>('hotel');
  const [travel, setTravel] = useState<TravelPlan>({});
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

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
      const [savedTravel, savedLocations, savedContacts] = await Promise.all([
        repo.getTravelPlan(),
        repo.getSavedLocations(),
        repo.getEmergencyContacts(),
      ]);
      setTravel(savedTravel ?? {});
      setLocations(savedLocations);
      setContacts(savedContacts);
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
    return null;
  }, [locations, hotel]);

  const groupPoint = useMemo<Point | null>(() => {
    const saved = locations.find((item) => item.id === 'meeting-point');
    return saved ?? null;
  }, [locations]);

  const destination = mode === 'hotel' ? hotelPoint : groupPoint;
  const distance = current && destination ? distanceMeters(current, destination) : null;
  const family = contacts[0];

  function getCurrentPosition() {
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
        setMessage(`Lokasi semasa ditemui • ketepatan ±${Math.round(position.coords.accuracy)} m.`);
        setLocating(false);
      },
      (error) => {
        setMessage(`GPS tidak dapat digunakan: ${error.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  function saveMeetingPointHere() {
    if (!('geolocation' in navigator)) {
      setMessage('GPS tidak tersedia pada peranti ini.');
      return;
    }
    setLocating(true);
    setMessage('Menyimpan tempat berkumpul…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          const point: SavedLocation = {
            id: 'meeting-point',
            label: group?.meetingPoint || 'Tempat berkumpul kumpulan',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: Date.now(),
          };
          await repo.setSavedLocation(point);
          setLocations(await repo.getSavedLocations());
          setMessage(`Tempat berkumpul disimpan offline • ketepatan ±${Math.round(position.coords.accuracy)} m.`);
          setLocating(false);
        })();
      },
      (error) => {
        setMessage(`Tidak dapat menyimpan lokasi: ${error.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  async function copyDestination() {
    if (!destination) {
      setMessage(mode === 'hotel' ? 'Lokasi hotel belum disimpan.' : 'Tempat berkumpul belum disimpan.');
      return;
    }
    const value = `${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Koordinat disalin: ${value}`);
    } catch {
      setMessage(`Koordinat: ${value}`);
    }
  }

  function openOnlineNavigation() {
    if (!destination) {
      setMessage('Destinasi belum mempunyai koordinat.');
      return;
    }
    if (!online) {
      setMessage('Navigasi peta memerlukan internet. Koordinat dan jarak lurus masih boleh digunakan offline.');
      return;
    }
    const target = `${destination.latitude},${destination.longitude}`;
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
  }

  function callNumber(phone?: string) {
    if (!phone) return;
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned) window.location.href = `tel:${cleaned}`;
  }

  return <main className="nav-app">
    <header className="nav-header">
      <div>
        <strong>TEMAN Haramain</strong>
        <span> Safety Navigation • by TGPU</span>
      </div>
      <span className={online ? 'nav-online' : 'nav-offline'}>{online ? 'Online' : 'Offline'}</span>
    </header>

    <button className="nav-back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

    <section className="nav-content">
      <div className="nav-mode-grid" role="tablist" aria-label="Pilih destinasi">
        <button className={mode === 'hotel' ? 'active' : ''} onClick={() => { setMode('hotel'); setMessage(''); }}>
          BALIK KE HOTEL
          <span>Lokasi hotel yang disimpan</span>
        </button>
        <button className={mode === 'group' ? 'active' : ''} onClick={() => { setMode('group'); setMessage(''); }}>
          CARI KUMPULAN
          <span>Tempat berkumpul & mutawwif</span>
        </button>
      </div>

      <div className="nav-card">
        <div className="nav-label">DESTINASI</div>
        <h1>{mode === 'hotel' ? (hotel?.name || 'Hotel belum disimpan') : (group?.meetingPoint || 'Tempat berkumpul belum disimpan')}</h1>
        {mode === 'hotel' && hotel?.addressArabic && <p className="nav-arabic" dir="rtl">{hotel.addressArabic}</p>}
        {mode === 'group' && group?.meetingPointArabic && <p className="nav-arabic" dir="rtl">{group.meetingPointArabic}</p>}
        {destination ? <p className="nav-coords">{destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}</p> : <p className="nav-missing">Koordinat belum disimpan.</p>}
      </div>

      <button className="nav-primary" onClick={getCurrentPosition} disabled={locating}>
        {locating ? 'MENCARI GPS…' : 'SEMAK JARAK SAYA SEKARANG'}
      </button>

      {distance !== null && <div className="nav-distance-card">
        <span>JARAK LURUS KE DESTINASI</span>
        <strong>{formatDistance(distance)}</strong>
        {current?.accuracyMeters && <small>Ketepatan GPS semasa ±{Math.round(current.accuracyMeters)} m</small>}
        <p>Ini jarak lurus, bukan jarak berjalan. Gunakan sebagai petunjuk apabila peta tidak tersedia.</p>
      </div>}

      <div className="nav-action-grid">
        <button onClick={() => void copyDestination()}>SALIN KOORDINAT</button>
        <button onClick={openOnlineNavigation} disabled={!destination}>BUKA NAVIGASI ONLINE</button>
      </div>

      {mode === 'group' && <>
        <div className="nav-group-card">
          <Info label="KOD KUMPULAN" value={group?.groupCode || '—'} />
          <Info label="NOMBOR BAS" value={group?.busNumber || '—'} />
          <Info label="MUTAWWIF" value={group?.mutawwifName || '—'} />
          <Info label="TELEFON" value={group?.mutawwifPhone || '—'} />
        </div>
        <button className="nav-secondary" onClick={saveMeetingPointHere} disabled={locating}>SIMPAN GPS TEMPAT BERKUMPUL INI</button>
      </>}

      <div className="nav-contact-grid">
        {group?.mutawwifPhone && <button onClick={() => callNumber(group.mutawwifPhone)}>TELEFON MUTAWWIF</button>}
        {family?.phone && <button onClick={() => callNumber(family.phone)}>TELEFON KELUARGA</button>}
      </div>

      {message && <div className="nav-message">{message}</div>}

      <div className="nav-offline-note">
        <strong>Offline-first</strong>
        <p>GPS, koordinat tersimpan, maklumat hotel/kumpulan dan pengiraan jarak boleh digunakan tanpa data internet. Peta jalan dan turn-by-turn navigation memerlukan sambungan internet atau peta yang telah dimuat turun.</p>
      </div>
    </section>
  </main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="nav-info-row"><span>{label}</span><strong>{value}</strong></div>;
}

function distanceMeters(a: Point, b: Point): number {
  const radius = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}
