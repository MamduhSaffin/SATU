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
  version: 'TH-KAH-1446H-M7-draft.1',
  reviewStatus: 'draft',
  schoolContext: 'Rujukan Malaysia / Tabung Haji. Jangan gunakan sebagai fatwa individu.',
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
      id: 'prepare-ihram',
      titleMs: 'Persediaan sebelum niat',
      titleAr: 'الاستعداد للإحرام',
      statusLabel: 'SUNAT',
      summaryMs: 'Mandi sunat ihram dan solat sunat ihram ialah amalan sunat sebelum berniat. Pakaian ihram hendaklah disediakan dengan betul.',
    },
    {
      id: 'niat-miqat',
      titleMs: 'Niat umrah di miqat',
      titleAr: 'نية العمرة عند الميقات',
      statusLabel: 'WAJIB',
      summaryMs: 'Pastikan niat ihram umrah dibuat pada miqat yang berkaitan. Niat ialah sebahagian daripada rukun umrah, manakala menjaga ketetapan miqat ialah kewajipan.',
    },
    {
      id: 'ihram-restrictions',
      titleMs: 'Jaga larangan ihram',
      titleAr: 'محظورات الإحرام',
      statusLabel: 'WAJIB',
      summaryMs: 'Selepas berniat, jaga larangan ihram sehingga selesai tahallul. Jika ragu-ragu tentang sesuatu keadaan, rujuk pembimbing ibadah.',
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
      summaryMs: 'Laksanakan tawaf umrah di Baitullah mengikut syarat dan tertib yang diterangkan oleh pembimbing ibadah.',
    },
    {
      id: 'saie',
      titleMs: 'Sa’i umrah',
      titleAr: 'سعي العمرة',
      statusLabel: 'RUKUN',
      summaryMs: 'Selepas tawaf, laksanakan sa’i antara Safa dan Marwah mengikut tertib.',
    },
    {
      id: 'tahallul',
      titleMs: 'Bercukur atau bergunting',
      titleAr: 'الحلق أو التقصير',
      statusLabel: 'RUKUN',
      summaryMs: 'Selesaikan umrah dengan bercukur atau bergunting sebagai tahallul.',
    },
    {
      id: 'tertib',
      titleMs: 'Jaga tertib rukun',
      titleAr: 'الترتيب',
      statusLabel: 'RUKUN',
      summaryMs: 'Rukun umrah dilaksanakan mengikut susunan yang ditetapkan. Jika berlaku kekeliruan, dapatkan bimbingan manusia yang bertauliah.',
    },
  ],
};
