export type EmergencyPhrase = {
  id: string;
  ms: string;
  ar: string;
  en: string;
  category: 'lost' | 'hotel' | 'group' | 'health' | 'transport';
  reviewStatus: 'draft' | 'reviewed';
};

// Draft content for prototype/offline testing. Arabic wording should receive
// final human review before production release.
export const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  {
    id: 'lost-group',
    category: 'lost',
    ms: 'Saya jemaah dari Malaysia dan saya terpisah daripada kumpulan saya. Boleh bantu saya?',
    ar: 'أنا حاج من ماليزيا وقد انفصلت عن مجموعتي. هل يمكنك مساعدتي؟',
    en: 'I am a pilgrim from Malaysia and I have been separated from my group. Could you help me?',
    reviewStatus: 'draft',
  },
  {
    id: 'return-hotel',
    category: 'hotel',
    ms: 'Saya mahu kembali ke hotel saya. Ini nama dan alamat hotel saya.',
    ar: 'أريد العودة إلى فندقي. هذا اسم الفندق وعنوانه.',
    en: 'I would like to return to my hotel. This is the hotel name and address.',
    reviewStatus: 'draft',
  },
  {
    id: 'contact-mutawwif',
    category: 'group',
    ms: 'Boleh bantu saya hubungi ketua kumpulan atau mutawwif saya?',
    ar: 'هل يمكنك مساعدتي في التواصل مع مسؤول مجموعتي أو المطوف؟',
    en: 'Could you help me contact my group leader or mutawwif?',
    reviewStatus: 'draft',
  },
  {
    id: 'need-medical-help',
    category: 'health',
    ms: 'Saya tidak sihat dan perlukan bantuan perubatan.',
    ar: 'أنا لست بخير وأحتاج إلى مساعدة طبية.',
    en: 'I am unwell and need medical assistance.',
    reviewStatus: 'draft',
  },
  {
    id: 'cannot-find-bus',
    category: 'transport',
    ms: 'Saya tidak dapat mencari bas kumpulan saya. Boleh bantu saya?',
    ar: 'لم أتمكن من العثور على حافلة مجموعتي. هل يمكنك مساعدتي؟',
    en: 'I cannot find my group bus. Could you help me?',
    reviewStatus: 'draft',
  },
];

export function findEmergencyPhrase(id: string): EmergencyPhrase | undefined {
  return EMERGENCY_PHRASES.find((phrase) => phrase.id === id);
}
