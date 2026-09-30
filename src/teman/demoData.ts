import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { UMRAH_MALAYSIA_DRAFT_PACK } from './ibadahContent';
import { TemanRepository } from './repository';
import type { EmergencyContact, PilgrimProfile, SavedLocation, TravelPlan } from './types';

export const DEMO_MODE_KEY = 'teman.demo.mode';

export async function seedTemanDemoData(): Promise<void> {
  const store = new IndexedDbLocalStore();
  const repo = new TemanRepository(store);

  await repo.clearAllTemanData();

  const profile: PilgrimProfile = {
    id: 'demo-pilgrim',
    fullName: 'JEMAAH DEMO MALAYSIA',
    preferredName: 'Encik Ahmad (Demo)',
    primaryLanguage: 'ms',
    malaysiaPhone: '+60120000000',
    saudiPhone: '+966500000000',
    accessibilityNotes: 'Contoh: warga emas, perlukan tulisan besar dan laluan mudah.',
  };

  const travel: TravelPlan = {
    makkahHotel: {
      name: 'HOTEL DEMO MAKKAH',
      addressEnglish: 'Demo location near central Makkah — not a real booking',
      addressArabic: 'موقع تجريبي في مكة المكرمة - ليس حجزًا حقيقيًا',
      latitude: 21.4234,
      longitude: 39.8277,
      room: 'DEMO 1208',
    },
    group: {
      groupCode: 'MY-DEMO-01',
      busNumber: 'BAS DEMO 12',
      mutawwifName: 'Mutawwif Demo',
      mutawwifPhone: '+966500000001',
      meetingPoint: 'Meeting Point Demo — entrance area',
      meetingPointArabic: 'نقطة تجمع تجريبية',
    },
    flightNotes: 'DATA DEMO SAHAJA — bukan maklumat perjalanan sebenar.',
  };

  const family: EmergencyContact = {
    id: 'demo-family',
    name: 'Keluarga Demo',
    relationship: 'Anak / penjaga',
    phone: '+60120000001',
    countryCode: '+60',
    priority: 1,
  };

  const hotelLocation: SavedLocation = {
    id: 'hotel-makkah',
    label: 'HOTEL DEMO MAKKAH',
    latitude: 21.4234,
    longitude: 39.8277,
    accuracyMeters: 15,
    capturedAt: Date.now(),
  };

  const meetingPoint: SavedLocation = {
    id: 'meeting-point',
    label: 'MEETING POINT DEMO',
    latitude: 21.42425,
    longitude: 39.82685,
    accuracyMeters: 15,
    capturedAt: Date.now(),
  };

  await repo.setPilgrim(profile);
  await repo.setTravelPlan(travel);
  await repo.setEmergencyContacts([family]);
  await repo.setSavedLocation(hotelLocation);
  await repo.setSavedLocation(meetingPoint);
  await repo.buildSafetyCard();
  await repo.updateOfflineAssets({
    emergencyPhrases: true,
    ibadahGuide: true,
    ibadahGuideVersion: UMRAH_MALAYSIA_DRAFT_PACK.version,
    ibadahGuideReviewStatus: UMRAH_MALAYSIA_DRAFT_PACK.reviewStatus,
    safetyCard: true,
    travelDetails: true,
    emergencyContacts: true,
    savedHotelLocation: true,
    offlineSelfTest: false,
  });
  await store.set(DEMO_MODE_KEY, true);

  localStorage.setItem('teman.locale', 'ms');
  localStorage.setItem('teman.satu.rate.sarMyr', '1.10');
  localStorage.setItem('teman.satu.budget.sar', '500');
  localStorage.setItem('teman.satu.spent.sar', '85');
  localStorage.setItem('teman.satu.notes', JSON.stringify([
    { id: 'demo-note-1', text: 'Beli 3 sejadah untuk keluarga', createdAt: Date.now() - 2000 },
    { id: 'demo-note-2', text: 'Hadiah kurma: Mak, Ayah, Kakak', createdAt: Date.now() - 1000 },
    { id: 'demo-note-3', text: 'Semak berat bagasi sebelum balik', createdAt: Date.now() },
  ]));
}

export async function resetTemanPrototypeData(): Promise<void> {
  const store = new IndexedDbLocalStore();
  const repo = new TemanRepository(store);
  await repo.clearAllTemanData();
  localStorage.removeItem('teman.locale');
  localStorage.removeItem('teman.satu.rate.sarMyr');
  localStorage.removeItem('teman.satu.budget.sar');
  localStorage.removeItem('teman.satu.spent.sar');
  localStorage.removeItem('teman.satu.notes');
  localStorage.removeItem('teman.tester.feedback.latest');
}

export async function isTemanDemoMode(): Promise<boolean> {
  const store = new IndexedDbLocalStore();
  return Boolean(await store.get<boolean>(DEMO_MODE_KEY));
}
