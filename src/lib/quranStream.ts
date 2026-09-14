// ─── Quran Audio Stream Library & Constants ──────────────────────────────────

export interface Reciter {
  id: number;
  name: string;
  name_arabic: string;
  style: "Murattal" | "Mujawwad" | string;
  primaryServer: string;
  fallbackServer?: string;
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
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/afs",
    fallbackServer: "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee",
  },
  {
    id: 2,
    name: "Abdul Rahman Al-Sudais",
    name_arabic: "عبدالرحمن السديس",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/sds",
    fallbackServer: "https://download.quranicaudio.com/quran/abdurrahmaan_as-sudais",
  },
  {
    id: 3,
    name: "Abdul Basit Abdul Samad (Murattal)",
    name_arabic: "عبدالباسط عبدالصمد - مرتل",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/basit",
    fallbackServer: "https://download.quranicaudio.com/quran/abdul_basit_murattal",
  },
  {
    id: 4,
    name: "Abdul Basit Abdul Samad (Mujawwad)",
    name_arabic: "عبدالباسط عبدالصمد - مجود",
    style: "Mujawwad",
    primaryServer: "https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad",
    fallbackServer: "https://download.quranicaudio.com/quran/abdul_basit_mujawwad",
  },
  {
    id: 5,
    name: "Maher Al Muaiqly",
    name_arabic: "ماهر المعيقلي",
    style: "Murattal",
    primaryServer: "https://server12.mp3quran.net/maher",
    fallbackServer: "https://download.quranicaudio.com/quran/maher_al_muaiqly",
  },
  {
    id: 6,
    name: "Saad Al-Ghamdi",
    name_arabic: "سعد الغامدي",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/s_gmd",
    fallbackServer: "https://download.quranicaudio.com/quran/sa3d_al-ghaamidi",
  },
  {
    id: 7,
    name: "Hani Ar-Rifai",
    name_arabic: "هاني الرفاعي",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/hani",
    fallbackServer: "https://download.quranicaudio.com/quran/hani_ar-rifai",
  },
  {
    id: 8,
    name: "Abu Bakr Al Shatri",
    name_arabic: "أبوبكر الشاطري",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/shatri",
    fallbackServer: "https://download.quranicaudio.com/quran/abu_bakr_ash-shaatree",
  },
  {
    id: 9,
    name: "Yasser Al-Dosari",
    name_arabic: "ياسر الدوسري",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/yasser",
    fallbackServer: "https://download.quranicaudio.com/quran/yasser_ad-dussary",
  },
  {
    id: 10,
    name: "Saud Al-Shuraim",
    name_arabic: "سعود الشريم",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/shur",
    fallbackServer: "https://download.quranicaudio.com/quran/sa3ood_al-shuraym",
  },
  {
    id: 11,
    name: "Abdullah Al-Juhany",
    name_arabic: "عبدالله الجهني",
    style: "Murattal",
    primaryServer: "https://server13.mp3quran.net/jhn",
    fallbackServer: "https://download.quranicaudio.com/quran/abdullaah_3awwaad_al-juhaynee",
  },
  {
    id: 12,
    name: "Bandar Baleela",
    name_arabic: "بندر بليلة",
    style: "Murattal",
    primaryServer: "https://server6.mp3quran.net/balilah",
    fallbackServer: "https://download.quranicaudio.com/quran/bandar_baleela/complete",
  },
  {
    id: 13,
    name: "Abdullah Al-Buajan",
    name_arabic: "عبدالله البعيجان",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/buajan",
  },
  {
    id: 14,
    name: "Mahmoud Khalil Al-Hussary",
    name_arabic: "محمود خليل الحصري",
    style: "Murattal",
    primaryServer: "https://server13.mp3quran.net/husr",
  },
  {
    id: 15,
    name: "Ali Al-Hudaify",
    name_arabic: "علي بن عبدالرحمن الحذيفي",
    style: "Murattal",
    primaryServer: "https://server9.mp3quran.net/hthfi",
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
