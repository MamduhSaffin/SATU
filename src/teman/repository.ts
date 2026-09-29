import type { LocalStore } from '../core/storage/indexedDb';
import type {
  EmergencyContact,
  OfflineAssetState,
  OfflineReadiness,
  PilgrimProfile,
  SafetyCardData,
  TravelPlan,
} from './types';

const KEYS = {
  pilgrim: 'teman.pilgrim.profile',
  travel: 'teman.travel.plan',
  contacts: 'teman.emergency.contacts',
  assets: 'teman.offline.assets',
  safetyCard: 'teman.safety.card',
} as const;

export class TemanRepository {
  constructor(private readonly store: LocalStore) {}

  getPilgrim(): Promise<PilgrimProfile | undefined> {
    return this.store.get<PilgrimProfile>(KEYS.pilgrim);
  }

  setPilgrim(profile: PilgrimProfile): Promise<void> {
    return this.store.set(KEYS.pilgrim, profile);
  }

  getTravelPlan(): Promise<TravelPlan | undefined> {
    return this.store.get<TravelPlan>(KEYS.travel);
  }

  setTravelPlan(plan: TravelPlan): Promise<void> {
    return this.store.set(KEYS.travel, plan);
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    return (await this.store.get<EmergencyContact[]>(KEYS.contacts)) ?? [];
  }

  async setEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
    const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
    await this.store.set(KEYS.contacts, sorted);
  }

  getOfflineAssets(): Promise<OfflineAssetState | undefined> {
    return this.store.get<OfflineAssetState>(KEYS.assets);
  }

  setOfflineAssets(state: OfflineAssetState): Promise<void> {
    return this.store.set(KEYS.assets, state);
  }

  getSafetyCard(): Promise<SafetyCardData | undefined> {
    return this.store.get<SafetyCardData>(KEYS.safetyCard);
  }

  setSafetyCard(card: SafetyCardData): Promise<void> {
    return this.store.set(KEYS.safetyCard, card);
  }

  async buildSafetyCard(): Promise<SafetyCardData | undefined> {
    const [pilgrim, travel, contacts] = await Promise.all([
      this.getPilgrim(),
      this.getTravelPlan(),
      this.getEmergencyContacts(),
    ]);

    if (!pilgrim) return undefined;

    const hotel = travel?.makkahHotel ?? travel?.madinahHotel;
    const group = travel?.group;
    const card: SafetyCardData = {
      pilgrimName: pilgrim.fullName,
      country: 'Malaysia',
      hotelName: hotel?.name,
      hotelAddressArabic: hotel?.addressArabic,
      groupCode: group?.groupCode,
      busNumber: group?.busNumber,
      mutawwifName: group?.mutawwifName,
      mutawwifPhone: group?.mutawwifPhone,
      emergencyContactPhone: contacts[0]?.phone,
    };

    await this.setSafetyCard(card);
    return card;
  }

  async assessOfflineReadiness(): Promise<OfflineReadiness> {
    const [pilgrim, travel, contacts, assets, safetyCard] = await Promise.all([
      this.getPilgrim(),
      this.getTravelPlan(),
      this.getEmergencyContacts(),
      this.getOfflineAssets(),
      this.getSafetyCard(),
    ]);

    const requiredMissing: string[] = [];
    const optionalMissing: string[] = [];

    if (!pilgrim?.fullName) requiredMissing.push('pilgrim-profile');
    if (!travel?.makkahHotel?.name && !travel?.madinahHotel?.name) requiredMissing.push('hotel');
    if (!travel?.group?.mutawwifPhone) requiredMissing.push('mutawwif-contact');
    if (contacts.length === 0) requiredMissing.push('family-emergency-contact');
    if (!safetyCard || !assets?.safetyCard) requiredMissing.push('safety-card');
    if (!assets?.emergencyPhrases) requiredMissing.push('emergency-phrases');
    if (!assets?.ibadahGuide) requiredMissing.push('ibadah-guide');

    if (!assets?.offlineMap) optionalMissing.push('offline-map');
    if (!assets?.arabicAudio) optionalMissing.push('arabic-audio');

    return {
      ready: requiredMissing.length === 0,
      requiredMissing,
      optionalMissing,
    };
  }
}
