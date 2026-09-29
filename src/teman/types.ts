import type { SupportedLocale } from '../core/i18n';

export type PilgrimProfile = {
  id: string;
  fullName: string;
  preferredName?: string;
  photoUri?: string;
  primaryLanguage: SupportedLocale;
  malaysiaPhone?: string;
  saudiPhone?: string;
  accessibilityNotes?: string;
};

export type HotelInfo = {
  name: string;
  addressEnglish?: string;
  addressArabic?: string;
  latitude?: number;
  longitude?: number;
  room?: string;
};

export type GroupInfo = {
  groupCode?: string;
  busNumber?: string;
  mutawwifName?: string;
  mutawwifPhone?: string;
  meetingPoint?: string;
  meetingPointArabic?: string;
};

export type TravelPlan = {
  makkahHotel?: HotelInfo;
  madinahHotel?: HotelInfo;
  group?: GroupInfo;
  flightNotes?: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  countryCode?: string;
  priority: number;
};

export type SafetyCardData = {
  pilgrimName: string;
  country: 'Malaysia';
  hotelName?: string;
  hotelAddressArabic?: string;
  groupCode?: string;
  busNumber?: string;
  mutawwifName?: string;
  mutawwifPhone?: string;
  emergencyContactPhone?: string;
};

export type OfflineAssetState = {
  emergencyPhrases: boolean;
  ibadahGuide: boolean;
  safetyCard: boolean;
  travelDetails: boolean;
  emergencyContacts: boolean;
  offlineMap?: boolean;
  arabicAudio?: boolean;
};

export type OfflineReadiness = {
  ready: boolean;
  requiredMissing: string[];
  optionalMissing: string[];
};
