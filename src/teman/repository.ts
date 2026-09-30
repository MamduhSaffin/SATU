import type { LocalStore } from '../core/storage/indexedDb';
import type {
  EmergencyContact,
  OfflineAssetState,
  OfflineReadiness,
  PilgrimProfile,
  SafetyCardData,
  SavedLocation,
  TravelPlan,
} from './types';

const KEYS = {
  pilgrim: 'teman.pilgrim.profile',
  travel: 'teman.travel.plan',
  contacts: 'teman.emergency.contacts',
  assets: 'teman.offline.assets',
  safetyCard: 'teman.safety.card',
  locations: 'teman.saved.locations',
} as const;

const OFFLINE_SELF_TEST_VERSION = 2;

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

  async updateOfflineAssets(patch: Partial<OfflineAssetState>): Promise<OfflineAssetState> {
    const current = await this.getOfflineAssets();
    const next: OfflineAssetState = {
      emergencyPhrases: current?.emergencyPhrases ?? true,
      ibadahGuide: current?.ibadahGuide ?? false,
      ibadahGuideVersion: current?.ibadahGuideVersion,
      ibadahGuideReviewStatus: current?.ibadahGuideReviewStatus,
      safetyCard: current?.safetyCard ?? false,
      travelDetails: current?.travelDetails ?? false,
      emergencyContacts: current?.emergencyContacts ?? false,
      offlineMap: current?.offlineMap ?? false,
      arabicAudio: current?.arabicAudio ?? false,
      savedHotelLocation: current?.savedHotelLocation ?? false,
      offlineSelfTest: current?.offlineSelfTest ?? false,
      offlineSelfTestVersion: current?.offlineSelfTestVersion,
      ...patch,
    };

    if (patch.offlineSelfTest === true) {
      next.offlineSelfTestVersion = OFFLINE_SELF_TEST_VERSION;
    } else if (patch.offlineSelfTest === false) {
      next.offlineSelfTestVersion = undefined;
    }

    await this.setOfflineAssets(next);
    return next;
  }

  async getSavedLocations(): Promise<SavedLocation[]> {
    return (await this.store.get<SavedLocation[]>(KEYS.locations)) ?? [];
  }

  async setSavedLocation(location: SavedLocation): Promise<void> {
    const current = await this.getSavedLocations();
    const next = [...current.filter((item) => item.id !== location.id), location];
    await this.store.set(KEYS.locations, next);
    if (location.id === 'hotel-makkah' || location.id === 'hotel-madinah') {
      await this.updateOfflineAssets({ savedHotelLocation: true });
    }
  }

  getSafetyCard(): Promise<SafetyCardData | undefined> {
    return this.store.get<SafetyCardData>(KEYS.safetyCard);
  }

  setSafetyCard(card: SafetyCardData): Promise<void> {
    return this.store.set(KEYS.safetyCard, card);
  }

  async buildSafetyCard(): Promise<SafetyCardData | undefined> {
    const [pilgrim, travel, contacts, locations] = await Promise.all([
      this.getPilgrim(),
      this.getTravelPlan(),
      this.getEmergencyContacts(),
      this.getSavedLocations(),
    ]);

    if (!pilgrim) return undefined;

    const hotel = travel?.makkahHotel ?? travel?.madinahHotel;
    const savedHotel = locations.find((item) => item.id === 'hotel-makkah') ?? locations.find((item) => item.id === 'hotel-madinah');
    const group = travel?.group;
    const card: SafetyCardData = {
      pilgrimName: pilgrim.fullName,
      country: 'Malaysia',
      hotelName: hotel?.name,
      hotelAddressArabic: hotel?.addressArabic,
      hotelLatitude: hotel?.latitude ?? savedHotel?.latitude,
      hotelLongitude: hotel?.longitude ?? savedHotel?.longitude,
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
    const reviewedIbadahGuide = Boolean(
      assets?.ibadahGuide
      && assets.ibadahGuideVersion
      && assets.ibadahGuideReviewStatus === 'reviewed',
    );
    const currentOfflineSelfTest = Boolean(
      assets?.offlineSelfTest
      && assets.offlineSelfTestVersion === OFFLINE_SELF_TEST_VERSION,
    );

    if (!pilgrim?.fullName) requiredMissing.push('pilgrim-profile');
    if (!travel?.makkahHotel?.name && !travel?.madinahHotel?.name) requiredMissing.push('hotel');
    if (!travel?.group?.mutawwifPhone) requiredMissing.push('mutawwif-contact');
    if (contacts.length === 0) requiredMissing.push('family-emergency-contact');
    if (!safetyCard || !assets?.safetyCard) requiredMissing.push('safety-card');
    if (!assets?.emergencyPhrases) requiredMissing.push('emergency-phrases');
    if (!reviewedIbadahGuide) requiredMissing.push('ibadah-guide');
    if (!currentOfflineSelfTest) requiredMissing.push('offline-self-test');

    if (!assets?.offlineMap) optionalMissing.push('offline-map');
    if (!assets?.arabicAudio) optionalMissing.push('arabic-audio');
    if (!assets?.savedHotelLocation) optionalMissing.push('saved-hotel-location');

    return {
      ready: requiredMissing.length === 0,
      requiredMissing,
      optionalMissing,
    };
  }
}
