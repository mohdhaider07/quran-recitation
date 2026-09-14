import fs from "fs/promises";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECITERS = [
  { id: 1, name: "Mishary Rashid Alafasy", edition: "ar.alafasy" },
  { id: 2, name: "Maher Al Muaiqly", edition: "ar.mahermuaiqly" },
  { id: 3, name: "Abu Bakr Al Shatri", edition: "ar.shaatree" },
  { id: 4, name: "Ahmed ibn Ali al-Ajamy", edition: "ar.ahmedajamy" },
  { id: 5, name: "Mahmoud Khalil Al-Husary", edition: "ar.husary" },
  { id: 6, name: "Mahmoud Khalil Al-Husary (Mujawwad)", edition: "ar.husarymujawwad" },
  { id: 7, name: "Ali Al-Hudaify", edition: "ar.hudhaify" },
  { id: 8, name: "Muhammad Ayyoub", edition: "ar.muhammadayyoub" },
  { id: 9, name: "Muhammad Jibreel", edition: "ar.muhammadjibreel" },
];

const metadataPath = path.resolve(__dirname, "../src/data/juzMetadata.json");

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 60,
  timeout: 10000,
});

function getAyahSize(edition, ayahNumber) {
  return new Promise((resolve) => {
    const url = `https://cdn.islamic.network/quran/audio/128/${edition}/${ayahNumber}.mp3`;
    const req = https.request(url, { method: "HEAD", agent }, (res) => {
      const len = parseInt(res.headers["content-length"] || "0", 10);
      res.resume();
      resolve(len);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

async function main() {
  console.log("Loading base metadata...");
  const raw = await fs.readFile(metadataPath, "utf-8");
  const allData = JSON.parse(raw);

  // First, ensure all base juz entries are also keyed as ${juz}_1
  for (let j = 1; j <= 30; j++) {
    if (allData[j] && !allData[`${j}_1`]) {
      allData[`${j}_1`] = { ...allData[j], reciter: "ar.alafasy", reciterId: 1 };
    }
  }

  // Phase 1: Rapidly generate Juz 1 for all reciters 2..9 so Juz 1 works immediately
  console.log("\n=== Phase 1: Generating Juz 1 for all reciters ===");
  const juz1BaseAyahs = allData["1"].ayahs;

  for (const reciter of RECITERS) {
    if (reciter.id === 1) continue;
    const key = `1_${reciter.id}`;
    if (allData[key] && allData[key].totalSize > 0) {
      console.log(`[Juz 1] Reciter ${reciter.name} already exists: ${allData[key].totalDuration}s`);
      continue;
    }

    console.log(`[Juz 1] Fetching 148 ayahs for ${reciter.name} (${reciter.edition})...`);
    const t0 = Date.now();
    const sizePromises = juz1BaseAyahs.map((a) => getAyahSize(reciter.edition, a.ayahNumber));
    const sizes = await Promise.all(sizePromises);

    let currentByte = 0;
    let currentSec = 0;
    const ayahs = [];

    for (let i = 0; i < juz1BaseAyahs.length; i++) {
      const base = juz1BaseAyahs[i];
      const size = sizes[i] || 0;
      const duration = Number(((size * 8) / 128000).toFixed(2));
      const byteStart = currentByte;
      const byteEnd = currentByte + size - 1;
      const startSec = Number(currentSec.toFixed(2));
      const endSec = Number((currentSec + duration).toFixed(2));

      ayahs.push({
        ayahNumber: base.ayahNumber,
        surahNumber: base.surahNumber,
        surahName: base.surahName,
        surahArabicName: base.surahArabicName,
        numberInSurah: base.numberInSurah,
        size,
        duration,
        byteStart,
        byteEnd,
        startSec,
        endSec,
        url: `https://cdn.islamic.network/quran/audio/128/${reciter.edition}/${base.ayahNumber}.mp3`,
      });

      currentByte += size;
      currentSec += duration;
    }

    allData[key] = {
      juz: 1,
      reciter: reciter.edition,
      reciterId: reciter.id,
      totalAyahs: ayahs.length,
      totalSize: currentByte,
      totalDuration: Number(currentSec.toFixed(2)),
      ayahs,
    };

    console.log(
      `[Juz 1] ${reciter.name}: ${(currentByte / (1024 * 1024)).toFixed(1)} MB, ${(currentSec / 60).toFixed(1)} mins in ${Date.now() - t0}ms`
    );
  }

  await fs.writeFile(metadataPath, JSON.stringify(allData, null, 2), "utf-8");
  console.log("Juz 1 metadata updated and saved for all 9 reciters!\n");

  // Phase 2: Generate all remaining Juz (2 to 30) for reciters 2..9
  console.log("=== Phase 2: Generating Juz 2 to 30 for all reciters ===");

  for (let j = 2; j <= 30; j++) {
    const baseJuz = allData[j.toString()];
    if (!baseJuz || !baseJuz.ayahs) continue;
    const baseAyahs = baseJuz.ayahs;

    for (const reciter of RECITERS) {
      if (reciter.id === 1) continue;
      const key = `${j}_${reciter.id}`;
      if (allData[key] && allData[key].totalSize > 0) {
        continue;
      }

      console.log(`[Juz ${j}] Fetching ${baseAyahs.length} ayahs for ${reciter.name}...`);
      const t0 = Date.now();
      const sizePromises = baseAyahs.map((a) => getAyahSize(reciter.edition, a.ayahNumber));
      const sizes = await Promise.all(sizePromises);

      let currentByte = 0;
      let currentSec = 0;
      const ayahs = [];

      for (let i = 0; i < baseAyahs.length; i++) {
        const base = baseAyahs[i];
        const size = sizes[i] || 0;
        const duration = Number(((size * 8) / 128000).toFixed(2));
        const byteStart = currentByte;
        const byteEnd = currentByte + size - 1;
        const startSec = Number(currentSec.toFixed(2));
        const endSec = Number((currentSec + duration).toFixed(2));

        ayahs.push({
          ayahNumber: base.ayahNumber,
          surahNumber: base.surahNumber,
          surahName: base.surahName,
          surahArabicName: base.surahArabicName,
          numberInSurah: base.numberInSurah,
          size,
          duration,
          byteStart,
          byteEnd,
          startSec,
          endSec,
          url: `https://cdn.islamic.network/quran/audio/128/${reciter.edition}/${base.ayahNumber}.mp3`,
        });

        currentByte += size;
        currentSec += duration;
      }

      allData[key] = {
        juz: j,
        reciter: reciter.edition,
        reciterId: reciter.id,
        totalAyahs: ayahs.length,
        totalSize: currentByte,
        totalDuration: Number(currentSec.toFixed(2)),
        ayahs,
      };

      console.log(
        `[Juz ${j}] ${reciter.name}: ${(currentByte / (1024 * 1024)).toFixed(1)} MB, ${(currentSec / 60).toFixed(1)} mins in ${Date.now() - t0}ms`
      );
    }

    // Save after each completed Juz
    await fs.writeFile(metadataPath, JSON.stringify(allData, null, 2), "utf-8");
    console.log(`[Juz ${j}] Saved for all reciters.`);
  }

  console.log("\nALL 30 JUZ SUCCESSFULLY GENERATED AND SAVED FOR ALL 9 RECITERS!");
}

main().catch(console.error);
