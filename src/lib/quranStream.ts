// ─── Quran Audio Stream Library & Constants ──────────────────────────────────

export interface Reciter {
  id: number;
  name: string;
  name_arabic: string;
  language: string;
  style: "Murattal" | "Mujawwad" | string;
  primaryServer: string;
  fallbackServer?: string;
  editionIdentifier?: string;
  /**
   * Per-ayah MP3 URL used by the Juz stream (`/api/juz-stream`).
   * Placeholders: `{ayahNumber}` (1–6236), `{surahPadded}` and `{versePadded}` (3 digits).
   */
  ayahAudioTemplate: string;
}

// ─── Quran Structure (Hafs) ──────────────────────────────────────────────────

export const TOTAL_AYAHS = 6236;

/** Number of ayahs in each surah (index 0 = Surah 1). */
export const SURAH_AYAH_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

/** Global ayah number at which each Juz begins (index 0 = Juz 1). */
export const JUZ_START_AYAH: readonly number[] = [
  1, 149, 260, 386, 517, 641, 751, 900, 1042, 1201, 1328, 1479, 1649, 1803, 2030, 2215, 2484, 2674,
  2876, 3215, 3386, 3564, 3733, 4090, 4265, 4511, 4706, 5105, 5242, 5673,
];

/** Returns the first and last global ayah numbers of a Juz (1–30). */
export function getJuzAyahRange(juz: number): [number, number] {
  const first = JUZ_START_AYAH[juz - 1];
  const last = juz < 30 ? JUZ_START_AYAH[juz] - 1 : TOTAL_AYAHS;
  return [first, last];
}

/** Maps a global ayah number (1–6236) to its surah and verse number. */
export function getAyahLocation(ayahNumber: number): { surah: number; verse: number } {
  let remaining = ayahNumber;
  for (let i = 0; i < SURAH_AYAH_COUNTS.length; i++) {
    if (remaining <= SURAH_AYAH_COUNTS[i]) {
      return { surah: i + 1, verse: remaining };
    }
    remaining -= SURAH_AYAH_COUNTS[i];
  }
  throw new RangeError(`Ayah ${ayahNumber} is outside 1-${TOTAL_AYAHS}`);
}

// ─── Juz Metadata API (`GET /api/juz-metadata`) ──────────────────────────────

/** One ayah on the Juz timeline, in seconds from the start of the Juz. */
export interface AyahTiming {
  ayahNumber: number;
  surahNumber: number;
  numberInSurah: number;
  startSec: number;
  endSec: number;
}

/** A separately streamed, format-uniform part of a Juz (most Juz have exactly one). */
export interface JuzSegmentInfo {
  url: string;
  startSec: number;
  duration: number;
}

export interface JuzMetadataResponse {
  juz: number;
  reciterId: number;
  totalDuration: number;
  segments: JuzSegmentInfo[];
  ayahs: AyahTiming[];
}

/** Expands a per-ayah URL template for a global ayah number. */
export function fillAyahAudioTemplate(template: string, ayahNumber: number): string {
  const { surah, verse } = getAyahLocation(ayahNumber);
  return template
    .replace("{ayahNumber}", String(ayahNumber))
    .replace("{surahPadded}", String(surah).padStart(3, "0"))
    .replace("{versePadded}", String(verse).padStart(3, "0"));
}

// ─── 30 Juz to Surahs Mapping ───────────────────────────────────────────────

export const JUZ_SURAHS_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [2],
  3: [2, 3],
  4: [3, 4],
  5: [4],
  6: [4, 5],
  7: [5, 6],
  8: [6, 7],
  9: [7, 8],
  10: [8, 9],
  11: [9, 10, 11],
  12: [11, 12],
  13: [12, 13, 14],
  14: [15, 16],
  15: [17, 18],
  16: [18, 19, 20],
  17: [21, 22],
  18: [23, 24, 25],
  19: [25, 26, 27],
  20: [27, 28, 29],
  21: [29, 30, 31, 32, 33],
  22: [33, 34, 35, 36],
  23: [36, 37, 38, 39],
  24: [39, 40, 41],
  25: [41, 42, 43, 44, 45],
  26: [46, 47, 48, 49, 50, 51],
  27: [51, 52, 53, 54, 55, 56, 57],
  28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
  29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
  30: [
    78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  ],
};

// ─── 100% Reliable, Verified High-Speed Quran CDN Reciters ───────────────────

export const RECITERS_LIST: Reciter[] = [
  {
    id: 1,
    name: "Mishary Rashid Alafasy",
    name_arabic: "مشاري راشد العفاسي",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/afs",
    fallbackServer: "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee",
    editionIdentifier: "ar.alafasy",
    ayahAudioTemplate: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayahNumber}.mp3",
  },
  {
    id: 2,
    name: "Maher Al Muaiqly",
    name_arabic: "ماهر المعيقلي",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server12.mp3quran.net/maher",
    fallbackServer: "https://download.quranicaudio.com/quran/maher_al_muaiqly",
    editionIdentifier: "ar.mahermuaiqly",
    ayahAudioTemplate:
      "https://cdn.islamic.network/quran/audio/128/ar.mahermuaiqly/{ayahNumber}.mp3",
  },
  {
    id: 3,
    name: "Abu Bakr Al Shatri",
    name_arabic: "أبوبكر الشاطري",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/shatri",
    fallbackServer: "https://download.quranicaudio.com/quran/abu_bakr_ash-shaatree",
    editionIdentifier: "ar.shaatree",
    ayahAudioTemplate: "https://cdn.islamic.network/quran/audio/128/ar.shaatree/{ayahNumber}.mp3",
  },
  {
    id: 4,
    name: "Ahmed ibn Ali al-Ajamy",
    name_arabic: "أحمد بن علي العجمي",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server10.mp3quran.net/ajm",
    fallbackServer: "https://download.quranicaudio.com/quran/ahmed_ibn_3ali_al-3ajamy",
    editionIdentifier: "ar.ahmedajamy",
    ayahAudioTemplate: "https://cdn.islamic.network/quran/audio/128/ar.ahmedajamy/{ayahNumber}.mp3",
  },
  {
    id: 5,
    name: "Mahmoud Khalil Al-Hussary",
    name_arabic: "محمود خليل الحصري",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server13.mp3quran.net/husr",
    fallbackServer: "https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree_iza3ah",
    editionIdentifier: "ar.husary",
    ayahAudioTemplate: "https://cdn.islamic.network/quran/audio/128/ar.husary/{ayahNumber}.mp3",
  },
  {
    id: 6,
    name: "Mahmoud Khalil Al-Hussary (Mujawwad)",
    name_arabic: "محمود خليل الحصري - مجود",
    language: "Arabic",
    style: "Mujawwad",
    primaryServer: "https://server13.mp3quran.net/husr/Almusshaf-Al-Mojawwad",
    fallbackServer: "https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree_mujawwad",
    editionIdentifier: "ar.husarymujawwad",
    ayahAudioTemplate:
      "https://cdn.islamic.network/quran/audio/128/ar.husarymujawwad/{ayahNumber}.mp3",
  },
  {
    id: 7,
    name: "Ali Al-Hudaify",
    name_arabic: "علي بن عبدالرحمن الحذيفي",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server9.mp3quran.net/hthfi",
    fallbackServer: "https://download.quranicaudio.com/quran/3alee_al_hudhaifee",
    editionIdentifier: "ar.hudhaify",
    ayahAudioTemplate: "https://cdn.islamic.network/quran/audio/128/ar.hudhaify/{ayahNumber}.mp3",
  },
  {
    id: 8,
    name: "Muhammad Ayyoub",
    name_arabic: "محمد أيوب",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/ayyub",
    fallbackServer: "https://download.quranicaudio.com/quran/muhammad_ayyoob",
    editionIdentifier: "ar.muhammadayyoub",
    ayahAudioTemplate:
      "https://cdn.islamic.network/quran/audio/128/ar.muhammadayyoub/{ayahNumber}.mp3",
  },
  {
    id: 9,
    name: "Muhammad Jibreel",
    name_arabic: "محمد جبريل",
    language: "Arabic",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/jbrl",
    fallbackServer: "https://download.quranicaudio.com/quran/muhammad_jibreel",
    editionIdentifier: "ar.muhammadjibreel",
    ayahAudioTemplate:
      "https://cdn.islamic.network/quran/audio/128/ar.muhammadjibreel/{ayahNumber}.mp3",
  },
  {
    id: 10,
    name: "Shamshad Ali Khan",
    name_arabic: "شمشاد علی خان",
    language: "Urdu",
    style: "Translation",
    primaryServer: "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps",
    fallbackServer: "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps",
    editionIdentifier: "ur.khan",
    ayahAudioTemplate:
      "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/{surahPadded}{versePadded}.mp3",
  },
];

// ─── 114 Surahs Metadata ────────────────────────────────────────────────────

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
}

export const SURAHS_META: Record<number, SurahMeta> = {
  1: { number: 1, name: "الفاتحة", englishName: "Al-Fatihah" },
  2: { number: 2, name: "البقرة", englishName: "Al-Baqarah" },
  3: { number: 3, name: "آل عمران", englishName: "Ali 'Imran" },
  4: { number: 4, name: "النساء", englishName: "An-Nisa" },
  5: { number: 5, name: "المائدة", englishName: "Al-Ma'idah" },
  6: { number: 6, name: "الأنعام", englishName: "Al-An'am" },
  7: { number: 7, name: "الأعراف", englishName: "Al-A'raf" },
  8: { number: 8, name: "الأنفال", englishName: "Al-Anfal" },
  9: { number: 9, name: "التوبة", englishName: "At-Tawbah" },
  10: { number: 10, name: "يونس", englishName: "Yunus" },
  11: { number: 11, name: "هود", englishName: "Hud" },
  12: { number: 12, name: "يوسف", englishName: "Yusuf" },
  13: { number: 13, name: "الرعد", englishName: "Ar-Ra'd" },
  14: { number: 14, name: "ابراهيم", englishName: "Ibrahim" },
  15: { number: 15, name: "الحجر", englishName: "Al-Hijr" },
  16: { number: 16, name: "النحل", englishName: "An-Nahl" },
  17: { number: 17, name: "الإسراء", englishName: "Al-Isra" },
  18: { number: 18, name: "الكهف", englishName: "Al-Kahf" },
  19: { number: 19, name: "مريم", englishName: "Maryam" },
  20: { number: 20, name: "طه", englishName: "Ta-Ha" },
  21: { number: 21, name: "الأنبياء", englishName: "Al-Anbiya" },
  22: { number: 22, name: "الحج", englishName: "Al-Hajj" },
  23: { number: 23, name: "المؤمنون", englishName: "Al-Mu'minun" },
  24: { number: 24, name: "النور", englishName: "An-Nur" },
  25: { number: 25, name: "الفرقان", englishName: "Al-Furqan" },
  26: { number: 26, name: "الشعراء", englishName: "Ash-Shu'ara" },
  27: { number: 27, name: "النمل", englishName: "An-Naml" },
  28: { number: 28, name: "القصص", englishName: "Al-Qasas" },
  29: { number: 29, name: "العنكبوت", englishName: "Al-'Ankabut" },
  30: { number: 30, name: "الروم", englishName: "Ar-Rum" },
  31: { number: 31, name: "لقمان", englishName: "Luqman" },
  32: { number: 32, name: "السجدة", englishName: "As-Sajdah" },
  33: { number: 33, name: "الأحزاب", englishName: "Al-Ahzab" },
  34: { number: 34, name: "سبإ", englishName: "Saba" },
  35: { number: 35, name: "فاطر", englishName: "Fatir" },
  36: { number: 36, name: "يس", englishName: "Ya-Sin" },
  37: { number: 37, name: "الصافات", englishName: "As-Saffat" },
  38: { number: 38, name: "ص", englishName: "Sad" },
  39: { number: 39, name: "الزمر", englishName: "Az-Zumar" },
  40: { number: 40, name: "غافر", englishName: "Ghafir" },
  41: { number: 41, name: "فصلت", englishName: "Fussilat" },
  42: { number: 42, name: "الشورى", englishName: "Ash-Shura" },
  43: { number: 43, name: "الزخرف", englishName: "Az-Zukhruf" },
  44: { number: 44, name: "الدخان", englishName: "Ad-Dukhan" },
  45: { number: 45, name: "الجاثية", englishName: "Al-Jathiyah" },
  46: { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf" },
  47: { number: 47, name: "محمد", englishName: "Muhammad" },
  48: { number: 48, name: "الفتح", englishName: "Al-Fath" },
  49: { number: 49, name: "الحجرات", englishName: "Al-Hujurat" },
  50: { number: 50, name: "ق", englishName: "Qaf" },
  51: { number: 51, name: "الذاريات", englishName: "Adh-Dhariyat" },
  52: { number: 52, name: "الطور", englishName: "At-Tur" },
  53: { number: 53, name: "النجم", englishName: "An-Najm" },
  54: { number: 54, name: "القمر", englishName: "Al-Qamar" },
  55: { number: 55, name: "الرحمن", englishName: "Ar-Rahman" },
  56: { number: 56, name: "الواقعة", englishName: "Al-Waqi'ah" },
  57: { number: 57, name: "الحديد", englishName: "Al-Hadid" },
  58: { number: 58, name: "المجادلة", englishName: "Al-Mujadila" },
  59: { number: 59, name: "الحشر", englishName: "Al-Hashr" },
  60: { number: 60, name: "الممتحنة", englishName: "Al-Mumtahanah" },
  61: { number: 61, name: "الصف", englishName: "As-Saff" },
  62: { number: 62, name: "الجمعة", englishName: "Al-Jumu'ah" },
  63: { number: 63, name: "المنافقون", englishName: "Al-Munafiqun" },
  64: { number: 64, name: "التغابن", englishName: "At-Taghabun" },
  65: { number: 65, name: "الطلاق", englishName: "At-Talaq" },
  66: { number: 66, name: "التحريم", englishName: "At-Tahrim" },
  67: { number: 67, name: "الملك", englishName: "Al-Mulk" },
  68: { number: 68, name: "القلم", englishName: "Al-Qalam" },
  69: { number: 69, name: "الحاقة", englishName: "Al-Haqqah" },
  70: { number: 70, name: "المعارج", englishName: "Al-Ma'arij" },
  71: { number: 71, name: "نوح", englishName: "Nuh" },
  72: { number: 72, name: "الجن", englishName: "Al-Jinn" },
  73: { number: 73, name: "المزمل", englishName: "Al-Muzzammil" },
  74: { number: 74, name: "المدثر", englishName: "Al-Muddaththir" },
  75: { number: 75, name: "القيامة", englishName: "Al-Qiyamah" },
  76: { number: 76, name: "الانسان", englishName: "Al-Insan" },
  77: { number: 77, name: "المرسلات", englishName: "Al-Mursalat" },
  78: { number: 78, name: "النبإ", englishName: "An-Naba" },
  79: { number: 79, name: "النازعات", englishName: "An-Nazi'at" },
  80: { number: 80, name: "عبس", englishName: "'Abasa" },
  81: { number: 81, name: "التكوير", englishName: "At-Takwir" },
  82: { number: 82, name: "الانفطار", englishName: "Al-Infitar" },
  83: { number: 83, name: "المطففين", englishName: "Al-Mutaffifin" },
  84: { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaq" },
  85: { number: 85, name: "البروج", englishName: "Al-Buruj" },
  86: { number: 86, name: "الطارق", englishName: "At-Tariq" },
  87: { number: 87, name: "الأعلى", englishName: "Al-A'la" },
  88: { number: 88, name: "الغاشية", englishName: "Al-Ghashiyah" },
  89: { number: 89, name: "الفجر", englishName: "Al-Fajr" },
  90: { number: 90, name: "البلد", englishName: "Al-Balad" },
  91: { number: 91, name: "الشمس", englishName: "Ash-Shams" },
  92: { number: 92, name: "الليل", englishName: "Al-Layl" },
  93: { number: 93, name: "الضحى", englishName: "Ad-Duha" },
  94: { number: 94, name: "الشرح", englishName: "Ash-Sharh" },
  95: { number: 95, name: "التين", englishName: "At-Tin" },
  96: { number: 96, name: "العلق", englishName: "Al-'Alaq" },
  97: { number: 97, name: "القدر", englishName: "Al-Qadr" },
  98: { number: 98, name: "البينة", englishName: "Al-Bayyinah" },
  99: { number: 99, name: "الزلزلة", englishName: "Az-Zalzalah" },
  100: { number: 100, name: "العاديات", englishName: "Al-'Adiyat" },
  101: { number: 101, name: "القارعة", englishName: "Al-Qari'ah" },
  102: { number: 102, name: "التكاثر", englishName: "At-Takathur" },
  103: { number: 103, name: "العصر", englishName: "Al-'Asr" },
  104: { number: 104, name: "الهمزة", englishName: "Al-Humazah" },
  105: { number: 105, name: "الفيل", englishName: "Al-Fil" },
  106: { number: 106, name: "قريش", englishName: "Quraysh" },
  107: { number: 107, name: "الماعون", englishName: "Al-Ma'un" },
  108: { number: 108, name: "الكوثر", englishName: "Al-Kawthar" },
  109: { number: 109, name: "الكافرون", englishName: "Al-Kafirun" },
  110: { number: 110, name: "النصر", englishName: "An-Nasr" },
  111: { number: 111, name: "المسد", englishName: "Al-Masad" },
  112: { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas" },
  113: { number: 113, name: "الفلق", englishName: "Al-Falaq" },
  114: { number: 114, name: "الناس", englishName: "An-Nas" },
};

/**
 * Returns the primary or fallback high-speed CDN audio URL for a given Surah and Reciter
 */
export function getSurahAudioUrl(
  surahNumber: number,
  reciterId: number,
  useFallback = false
): string {
  const pad = surahNumber.toString().padStart(3, "0");
  const reciter = RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];

  if (useFallback && reciter.fallbackServer) {
    return `${reciter.fallbackServer}/${pad}.mp3`;
  }
  return `${reciter.primaryServer}/${pad}.mp3`;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS string
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
