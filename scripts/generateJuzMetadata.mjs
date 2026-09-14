import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECITER = "ar.alafasy";
const JUZ_CONCURRENCY = 2;
const AYAH_CONCURRENCY = 8;

const outDir = path.resolve(__dirname, "../src/data");
const outFile = path.join(outDir, "juzMetadata.json");

async function loadExisting() {
  try {
    const data = await fs.readFile(outFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveMetadata(data) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchJuzAyahs(juz) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/juz/${juz}/${RECITER}`);
      if (res.ok) {
        const json = await res.json();
        return json.data.ayahs;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  throw new Error(`Failed to fetch ayahs for Juz ${juz}`);
}

async function getAyahSizeWithRetry(url, surahNumber, numberInSurah) {
  // Primary URL check with retries
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        const len = res.headers.get("content-length");
        if (len && parseInt(len, 10) > 0) return parseInt(len, 10);
      }
    } catch {
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  // Fallback to verses.quran.com
  const sPad = surahNumber.toString().padStart(3, "0");
  const aPad = numberInSurah.toString().padStart(3, "0");
  const fallbackUrl = `https://verses.quran.com/Alafasy/mp3/${sPad}${aPad}.mp3`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(fallbackUrl, { method: "HEAD" });
      if (res.ok) {
        const len = res.headers.get("content-length");
        if (len && parseInt(len, 10) > 0) return parseInt(len, 10);
      }
    } catch {
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  return 0;
}

async function processJuz(juz) {
  const t0 = Date.now();
  const ayahs = await fetchJuzAyahs(juz);

  const queue = [...ayahs];
  const results = new Map();

  async function worker() {
    while (queue.length > 0) {
      const a = queue.shift();
      if (!a) break;
      const size = await getAyahSizeWithRetry(a.audio, a.surah.number, a.numberInSurah);
      results.set(a.number, size);
    }
  }

  await Promise.all(Array.from({ length: AYAH_CONCURRENCY }, worker));

  let currentByte = 0;
  let currentSec = 0;
  const processedAyahs = [];

  for (const a of ayahs) {
    const size = results.get(a.number) || 0;
    const bitrate = a.number === 1 ? 192000 : 128000;
    const duration = Number(((size * 8) / bitrate).toFixed(2));
    const byteStart = currentByte;
    const byteEnd = currentByte + size - 1;
    const startSec = Number(currentSec.toFixed(2));
    const endSec = Number((currentSec + duration).toFixed(2));

    processedAyahs.push({
      ayahNumber: a.number,
      surahNumber: a.surah.number,
      surahName: a.surah.englishName,
      surahArabicName: a.surah.name,
      numberInSurah: a.numberInSurah,
      size,
      duration,
      byteStart,
      byteEnd,
      startSec,
      endSec,
      url: a.audio,
    });

    currentByte += size;
    currentSec += duration;
  }

  const zeroCount = processedAyahs.filter((x) => x.size === 0).length;
  console.log(
    `[Juz ${juz}] Processed ${ayahs.length} ayahs in ${Date.now() - t0}ms (${(currentByte / (1024 * 1024)).toFixed(1)} MB, ${(currentSec / 60).toFixed(1)} mins, zeros: ${zeroCount})`
  );

  return {
    juz,
    reciter: RECITER,
    totalAyahs: ayahs.length,
    totalSize: currentByte,
    totalDuration: Number(currentSec.toFixed(2)),
    ayahs: processedAyahs,
  };
}

async function main() {
  console.log(`Starting resilient metadata generation for ${RECITER}...`);
  const allJuzData = await loadExisting();

  const juzToProcess = [];
  for (let i = 1; i <= 30; i++) {
    const entry = allJuzData[i];
    const hasZeros = entry && entry.ayahs && entry.ayahs.some((a) => a.size === 0);
    if (!entry || !entry.totalSize || entry.totalSize === 0 || hasZeros) {
      juzToProcess.push(i);
    } else {
      console.log(`[Juz ${i}] Already complete and verified (${entry.totalAyahs} ayahs, 0 zeros).`);
    }
  }

  if (juzToProcess.length === 0) {
    console.log("All 30 Juz already completely verified!");
    return;
  }

  console.log(`Need to process/repair ${juzToProcess.length} Juz:`, juzToProcess.join(", "));
  const queue = [...juzToProcess];

  async function juzWorker() {
    while (queue.length > 0) {
      const juz = queue.shift();
      if (!juz) break;
      try {
        const data = await processJuz(juz);
        allJuzData[juz] = data;
        await saveMetadata(allJuzData);
      } catch (err) {
        console.error(`Failed to process Juz ${juz}:`, err);
      }
    }
  }

  await Promise.all(Array.from({ length: JUZ_CONCURRENCY }, juzWorker));
  await saveMetadata(allJuzData);
  console.log(`Successfully completed verification for all 30 Juz in ${outFile}`);
}

main().catch(console.error);
