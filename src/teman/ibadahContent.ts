export type IbadahReviewStatus = 'draft' | 'reviewed';

export type IbadahStep = {
  id: string;
  titleMs: string;
  titleAr?: string;
  statusLabel: 'SUNAT' | 'WAJIB' | 'RUKUN';
  summaryMs: string;
};

export type IbadahSource = {
  title: string;
  publisher: string;
  url: string;
};

export type IbadahPack = {
  id: string;
  title: string;
  version: string;
  reviewStatus: IbadahReviewStatus;
  schoolContext: string;
  sourceCheckedAt: string;
  sources: IbadahSource[];
  steps: IbadahStep[];
};

// Source-controlled content pack for engineering and review.
// Although the source material is official Tabung Haji guidance, this TEMAN
// transcription/paraphrase remains DRAFT until a qualified human reviewer
// checks the wording and approves the pack version in the product workflow.
export const UMRAH_MALAYSIA_DRAFT_PACK: IbadahPack = {
  id: 'umrah-malaysia-basic',
  title: 'Panduan Asas Umrah — Malaysia',
  version: 'TH-KAH-1446H-M7-draft.2',
  reviewStatus: 'draft',
  schoolContext: 'Rujukan Malaysia / Tabung Haji. Bukan fatwa individu.',
  sourceCheckedAt: '2026-09-30',
  sources: [
    {
      title: 'Nota KAH 1446H — Minggu 7: Jenis Haji dan Cara-cara Mengerjakan Haji',
      publisher: 'Lembaga Tabung Haji',
      url: 'https://www.tabunghaji.gov.my/sites/default/kah/NOTA%20KAH%201446H%20_%20M7_compressed_0.pdf',
    },
    {
      title: 'e-Bimbingan Haji',
      publisher: 'Lembaga Tabung Haji',
      url: 'https://www.tabunghaji.gov.my/bm/e-bimbingan',
    },
  ],
  steps: [
    {
      id: 'mandi-solat-ihram',
      titleMs: 'Mandi dan solat sunat ihram',
      titleAr: 'الغسل وصلاة سنة الإحرام',
      statusLabel: 'SUNAT',
      summaryMs: 'Sebelum berniat, mandi sunat ihram dan solat sunat ihram termasuk amalan sunat yang disebut dalam nota KAH.',
    },
    {
      id: 'pakaian-ihram',
      titleMs: 'Memakai pakaian ihram',
      titleAr: 'لبس الإحرام',
      statusLabel: 'WAJIB',
      summaryMs: 'Nota KAH menandakan pemakaian pakaian ihram sebagai perkara wajib dalam persediaan sebelum niat.',
    },
    {
      id: 'niat-umrah',
      titleMs: 'Niat ihram umrah',
      titleAr: 'نية إحرام العمرة',
      statusLabel: 'RUKUN',
      summaryMs: 'Niat ihram umrah ialah rukun umrah. Gunakan lafaz dan kaedah yang diajar oleh pembimbing ibadah anda.',
    },
    {
      id: 'miqat',
      titleMs: 'Berniat di miqat',
      titleAr: 'الإحرام من الميقات',
      statusLabel: 'WAJIB',
      summaryMs: 'Menjaga tempat dan masa miqat yang berkaitan ialah kewajipan. Pastikan miqat perjalanan anda disahkan sebelum berlepas.',
    },
    {
      id: 'ihram-restrictions',
      titleMs: 'Jaga larangan ihram',
      titleAr: 'محظورات الإحرام',
      statusLabel: 'WAJIB',
      summaryMs: 'Selepas berniat, jaga larangan ihram sehingga selesai bercukur atau bergunting. Jika ragu-ragu, rujuk pembimbing ibadah.',
    },
    {
      id: 'talbiyah',
      titleMs: 'Talbiah menuju tawaf',
      titleAr: 'التلبية',
      statusLabel: 'SUNAT',
      summaryMs: 'Talbiah diamalkan selepas berniat sehingga sebelum memulakan tawaf umrah.',
    },
    {
      id: 'tawaf',
      titleMs: 'Tawaf umrah',
      titleAr: 'طواف العمرة',
      statusLabel: 'RUKUN',
      summaryMs: 'Laksanakan tawaf umrah di Baitullah mengikut syarat dan tatacara yang dipelajari daripada pembimbing ibadah.',
    },
    {
      id: 'saie',
      titleMs: 'Sa’i umrah',
      titleAr: 'سعي العمرة',
      statusLabel: 'RUKUN',
      summaryMs: 'Selepas tawaf, laksanakan sa’i antara Safa dan Marwah mengikut tatacara yang dipelajari.',
    },
    {
      id: 'tahallul',
      titleMs: 'Bercukur atau bergunting',
      titleAr: 'الحلق أو التقصير',
      statusLabel: 'RUKUN',
      summaryMs: 'Bercukur atau bergunting ialah rukun yang menyempurnakan tahallul umrah.',
    },
    {
      id: 'tertib',
      titleMs: 'Tertib rukun umrah',
      titleAr: 'الترتيب',
      statusLabel: 'RUKUN',
      summaryMs: 'Rukun umrah dilaksanakan mengikut susunan yang ditetapkan. Dapatkan bantuan pembimbing jika berlaku kekeliruan.',
    },
  ],
};
