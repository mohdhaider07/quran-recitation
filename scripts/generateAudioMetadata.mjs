/**
 * Generates src/data/audioMetadata.json — the per-ayah audio map behind /api/juz-stream and
 * /api/juz-metadata.
 *
 * For every reciter and every ayah file it reads only the first 16 KB (HTTP Range) to find:
 *  - where the MPEG audio frames start (after ID3v2 tags, junk bytes and the Xing/Info frame),
 *  - where they end (Xing byte count, or the file size minus a trailing ID3v1 tag),
 *  - the exact duration (Xing frame count, or CBR byte math; non-CBR files are scanned fully),
 *  - the sample rate and channel count.
 *
 * Each Juz is streamed as continuous MP3, and Chrome aborts playback with
 * "Unsupported midstream configuration change" when the sample rate or channel count changes
 * mid-stream. Files whose format differs from the reciter's main format are replaced by the
 * alternate sources below when one has the main format; otherwise their format is recorded and
 * the server splits that Juz into separately streamed segments at each format change.
 *
 * Usage (Node 23.6+, run from web/):
 *   pnpm generate:audio [--reciter=3] [--cache=/tmp/audio-probe-cache.json]
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RECITERS_LIST,
  TOTAL_AYAHS,
  getJuzAyahRange,
  fillAyahAudioTemplate,
} from "../src/lib/quranStream.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/data/audioMetadata.json");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  })
);
const CACHE_FILE = args.cache ?? path.join(os.tmpdir(), "peaceful-quran-audio-probe-cache.json");
const ONLY_RECITER = args.reciter ? Number(args.reciter) : null;

const HEAD_BYTES = 16384;
const HOST_CONCURRENCY = { "cdn.islamic.network": 96, "everyayah.com": 12 };

/** Same-reciter sources tried (in order) when a file's format doesn't match its Juz. */
const ALTERNATE_TEMPLATES = {
  1: ["https://everyayah.com/data/Alafasy_128kbps/{surahPadded}{versePadded}.mp3"],
  2: [
    "https://everyayah.com/data/MaherAlMuaiqly128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Maher_AlMuaiqly_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  3: [
    "https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  4: [
    "https://everyayah.com/data/Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com/{surahPadded}{versePadded}.mp3",
  ],
  5: [
    "https://everyayah.com/data/Husary_128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Husary_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  6: [
    "https://everyayah.com/data/Husary_128kbps_Mujawwad/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Husary_Mujawwad_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  7: [
    "https://everyayah.com/data/Hudhaify_128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Hudhaify_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  8: [
    "https://everyayah.com/data/Muhammad_Ayyoub_128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Muhammad_Ayyoub_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  9: [
    "https://everyayah.com/data/Muhammad_Jibreel_128kbps/{surahPadded}{versePadded}.mp3",
    "https://everyayah.com/data/Muhammad_Jibreel_64kbps/{surahPadded}{versePadded}.mp3",
  ],
  10: [],
};

// ─── MPEG audio parsing ──────────────────────────────────────────────────────

const SAMPLE_RATES = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};
const BITRATES_MPEG1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_MPEG2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

/** Parses an MPEG-1/2/2.5 Layer III frame header at `i`, or returns null. */
function parseFrameHeader(buf, i) {
  if (i + 4 > buf.length || buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (buf[i + 1] >> 3) & 3;
  const layerBits = (buf[i + 1] >> 1) & 3;
  const bitrateIndex = buf[i + 2] >> 4;
  const sampleRateIndex = (buf[i + 2] >> 2) & 3;
  if (versionBits === 1 || layerBits !== 1) return null;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const isMpeg1 = versionBits === 3;
  const channelMode = buf[i + 3] >> 6;
  const sampleRate = SAMPLE_RATES[versionBits][sampleRateIndex];
  const bitrate = (isMpeg1 ? BITRATES_MPEG1 : BITRATES_MPEG2)[bitrateIndex];
  const samplesPerFrame = isMpeg1 ? 1152 : 576;
  const padding = (buf[i + 2] >> 1) & 1;
  const length = Math.floor(((samplesPerFrame / 8) * bitrate * 1000) / sampleRate) + padding;
  const sideInfoLength = isMpeg1 ? (channelMode === 3 ? 17 : 32) : channelMode === 3 ? 9 : 17;
  return {
    versionBits,
    sampleRate,
    bitrate,
    channels: channelMode === 3 ? 1 : 2,
    samplesPerFrame,
    length,
    sideInfoLength,
  };
}

const sameStream = (a, b) => a.versionBits === b.versionBits && a.sampleRate === b.sampleRate;

/** Finds the first frame at or after `from` whose successor is also a valid frame. */
function findFirstFrame(buf, from) {
  for (let i = from; i + 4 <= buf.length; i++) {
    const header = parseFrameHeader(buf, i);
    if (!header) continue;
    const next = parseFrameHeader(buf, i + header.length);
    if (next && sameStream(header, next)) return { offset: i, header };
  }
  return null;
}

const readUint32 = (buf, i) =>
  ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]) >>> 0;
const ascii = (buf, i, n) => String.fromCharCode(...buf.subarray(i, i + n));

/** Reads a Xing/Info or VBRI header from the first frame, if present. */
function readVbrHeader(buf, offset, header) {
  const xingAt = offset + 4 + header.sideInfoLength;
  const tag = ascii(buf, xingAt, 4);
  if (tag === "Xing" || tag === "Info") {
    const flags = readUint32(buf, xingAt + 4);
    let cursor = xingAt + 8;
    let frames = null;
    let bytes = null;
    if (flags & 1) {
      frames = readUint32(buf, cursor);
      cursor += 4;
    }
    if (flags & 2) bytes = readUint32(buf, cursor);
    return { frames, bytes };
  }
  if (ascii(buf, offset + 36, 4) === "VBRI") {
    return { bytes: readUint32(buf, offset + 36 + 10), frames: readUint32(buf, offset + 36 + 14) };
  }
  return null;
}

/** Walks consecutive frames from `start`, resyncing over junk, and summarises them. */
function scanFrames(buf, start, { stopAtJunk = false } = {}) {
  let i = start;
  let frames = 0;
  let seconds = 0;
  let end = start;
  let previousValid = true;
  const bitrates = new Set();
  const formats = new Set();
  while (i + 4 <= buf.length) {
    const header = parseFrameHeader(buf, i);
    const complete = header && i + header.length <= buf.length;
    // After junk, only accept a header that is followed by another valid one.
    const trusted =
      complete && (previousValid || parseFrameHeader(buf, i + header.length) !== null);
    if (trusted) {
      frames++;
      seconds += header.samplesPerFrame / header.sampleRate;
      bitrates.add(header.bitrate);
      formats.add(`${header.sampleRate}/${header.channels}`);
      i += header.length;
      end = i;
      previousValid = true;
    } else {
      if (stopAtJunk || (header && !complete)) break;
      previousValid = false;
      i++;
    }
  }
  return { frames, seconds, end, bitrates: [...bitrates], formats: [...formats] };
}

function skipId3v2(buf) {
  let offset = 0;
  while (offset + 10 <= buf.length && ascii(buf, offset, 3) === "ID3") {
    const size =
      ((buf[offset + 6] & 0x7f) << 21) |
      ((buf[offset + 7] & 0x7f) << 14) |
      ((buf[offset + 8] & 0x7f) << 7) |
      (buf[offset + 9] & 0x7f);
    offset += 10 + size + (buf[offset + 5] & 0x10 ? 10 : 0);
  }
  return offset;
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const limiters = new Map();
function limiterFor(url) {
  const host = new URL(url).host;
  if (!limiters.has(host)) {
    limiters.set(host, { active: 0, max: HOST_CONCURRENCY[host] ?? 8, queue: [] });
  }
  return limiters.get(host);
}

async function withLimit(url, task) {
  const limiter = limiterFor(url);
  if (limiter.active >= limiter.max) {
    await new Promise((resolve) => limiter.queue.push(resolve));
  }
  limiter.active++;
  try {
    return await task();
  } finally {
    limiter.active--;
    limiter.queue.shift()?.();
  }
}

async function httpGet(url, range) {
  return withLimit(url, async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(url, {
          headers: range ? { Range: range } : {},
          signal: AbortSignal.timeout(60000),
        });
        // 416 = the file is empty on the CDN; like 403/404 it will not change on retry.
        if (res.status === 404 || res.status === 403 || res.status === 416) {
          return { missing: true };
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = new Uint8Array(await res.arrayBuffer());
        const total = Number(res.headers.get("content-range")?.split("/")[1]);
        return { body, size: res.status === 206 && total ? total : body.length };
      } catch (err) {
        if (attempt >= 5) throw new Error(`${url}: ${err.message}`);
        await sleep(400 * attempt);
      }
    }
  });
}

// ─── Probing ─────────────────────────────────────────────────────────────────

/**
 * Probes one MP3 file. Returns
 * { size, start, end, sampleRate, channels, bitrate, bitrates, frames, seconds, exact }
 * where `start`/`end` delimit the audio frames that get streamed and `seconds` is the duration.
 */
async function probeFile(url) {
  const head = await httpGet(url, `bytes=0-${HEAD_BYTES - 1}`);
  if (head.missing) return { missing: true };

  let buf = head.body;
  let base = 0;
  const id3End = skipId3v2(buf);
  if (id3End + 4096 > buf.length && buf.length < head.size) {
    // Oversized ID3v2 tag (e.g. embedded artwork): read the window right after it.
    base = id3End;
    buf = (await httpGet(url, `bytes=${base}-${base + HEAD_BYTES - 1}`)).body;
  }
  const first = findFirstFrame(buf, base === 0 ? id3End : 0);
  if (!first) return { broken: true, size: head.size };

  const vbr = readVbrHeader(buf, first.offset, first.header);
  const audioOffset = vbr ? first.offset + first.header.length : first.offset;
  const audioHeader = parseFrameHeader(buf, audioOffset) ?? first.header;
  const window = scanFrames(buf, audioOffset, { stopAtJunk: true });

  const result = {
    size: head.size,
    start: base + audioOffset,
    end: head.size,
    sampleRate: audioHeader.sampleRate,
    channels: audioHeader.channels,
    bitrate: audioHeader.bitrate,
    bitrates: window.bitrates,
    formats: window.formats,
    frames: vbr?.frames ?? null,
    seconds: null,
    exact: false,
  };

  if (vbr?.bytes) {
    result.end = Math.min(base + first.offset + vbr.bytes, head.size);
  } else {
    const tailStart = Math.max(0, head.size - 160);
    const tail = (await httpGet(url, `bytes=${tailStart}-${head.size - 1}`)).body;
    let end = head.size;
    if (tail.length >= 128 && ascii(tail, tail.length - 128, 3) === "TAG") end -= 128;
    const apeAt = tail.length - (head.size - end) - 32;
    if (apeAt >= 0 && ascii(tail, apeAt, 8) === "APETAGEX") {
      const apeSize = tail[apeAt + 12] | (tail[apeAt + 13] << 8) | (tail[apeAt + 14] << 16);
      const hasHeader = (tail[apeAt + 23] & 0x80) !== 0;
      end -= apeSize + (hasHeader ? 32 : 0);
    }
    result.end = end;
  }

  if (result.frames) {
    result.seconds = (result.frames * audioHeader.samplesPerFrame) / audioHeader.sampleRate;
    result.exact = true;
  } else {
    result.seconds = ((result.end - result.start) * 8) / (audioHeader.bitrate * 1000);
  }
  return result;
}

/** Downloads a whole file and counts its frames — exact duration for VBR files. */
async function scanFile(url, probe) {
  const { body } = await httpGet(url);
  const scan = scanFrames(body, probe.start);
  return {
    ...probe,
    end: Math.min(scan.end, probe.end),
    seconds: scan.seconds,
    frames: scan.frames,
    bitrates: scan.bitrates,
    formats: scan.formats,
    exact: true,
    scanned: true,
  };
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let cache = {};
let cacheDirty = 0;
async function loadCache() {
  try {
    cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf-8"));
  } catch {
    cache = {};
  }
}
async function saveCache(force = false) {
  if (!force && cacheDirty < 500) return;
  cacheDirty = 0;
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
}

async function cached(key, compute) {
  if (cache[key]) return cache[key];
  let value;
  try {
    value = await compute();
  } catch (err) {
    // Network failures are not cached, so the next run retries them.
    console.warn(`  ! ${err.message}`);
    return { broken: true };
  }
  cache[key] = value;
  cacheDirty++;
  await saveCache();
  return value;
}

const probe = (url) => cached(`probe:${url}`, () => probeFile(url));
const scan = async (url) => {
  const head = await probe(url);
  if (head.missing || head.broken) return head;
  return cached(`scan:${url}`, () => scanFile(url, head));
};

// ─── Main ────────────────────────────────────────────────────────────────────

const formatKey = (file) => `${file.sampleRate}/${file.channels}`;
const isUniform = (file) => !file.formats || file.formats.length <= 1;

async function mapWithProgress(items, label, fn) {
  let done = 0;
  const timer = setInterval(() => console.log(`  ${label}: ${done}/${items.length}`), 15000);
  try {
    return await Promise.all(
      items.map(async (item) => {
        const value = await fn(item);
        done++;
        return value;
      })
    );
  } finally {
    clearInterval(timer);
  }
}

async function buildReciter(reciter) {
  const ayahNumbers = Array.from({ length: TOTAL_AYAHS }, (_, i) => i + 1);
  const urls = ayahNumbers.map((n) => fillAyahAudioTemplate(reciter.ayahAudioTemplate, n));

  console.log(`\n[${reciter.id}] ${reciter.name}: probing ${urls.length} files`);
  let files = await mapWithProgress(urls, "probe", probe);

  // The dominant bitrate tells CBR files apart from files that need a full frame count.
  const bitrateCounts = new Map();
  files.forEach(
    (f) => f.bitrate && bitrateCounts.set(f.bitrate, (bitrateCounts.get(f.bitrate) ?? 0) + 1)
  );
  const dominantBitrate = [...bitrateCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const needsScan = (f) =>
    !f.missing && !f.broken && !f.exact && (f.bitrates.length > 1 || f.bitrate !== dominantBitrate);

  const toScan = ayahNumbers.filter((n) => needsScan(files[n - 1]));
  console.log(
    `[${reciter.id}] dominant bitrate ${dominantBitrate} kbps; full scans needed: ${toScan.length}`
  );
  await mapWithProgress(toScan, "scan", async (n) => {
    files[n - 1] = await scan(urls[n - 1]);
  });

  const formatCounts = new Map();
  files.forEach(
    (f) =>
      !f.missing &&
      !f.broken &&
      formatCounts.set(formatKey(f), (formatCounts.get(formatKey(f)) ?? 0) + 1)
  );
  const mainFormat = [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const sources = urls.slice();
  const report = { replaced: [], kept: [], dropped: [] };

  for (const n of ayahNumbers) {
    const f = files[n - 1];
    const usable = !f.missing && !f.broken && isUniform(f);
    if (usable && formatKey(f) === mainFormat) continue;

    let replacement = null;
    for (const template of ALTERNATE_TEMPLATES[reciter.id] ?? []) {
      const url = fillAyahAudioTemplate(template, n);
      let candidate = await probe(url);
      if (candidate.missing || candidate.broken || formatKey(candidate) !== mainFormat) continue;
      if (!candidate.exact) candidate = await scan(url);
      if (isUniform(candidate)) {
        replacement = { url, file: candidate };
        break;
      }
    }
    if (replacement) {
      files[n - 1] = replacement.file;
      sources[n - 1] = replacement.url;
      report.replaced.push(n);
    } else if (usable) {
      report.kept.push(n); // Streamed as its own segment.
    } else {
      files[n - 1] = { missing: true };
      report.dropped.push(n);
    }
  }

  await saveCache(true);
  const formats = [mainFormat, ...new Set(report.kept.map((n) => formatKey(files[n - 1])))];
  const segmentedJuz = [];
  for (let juz = 1; juz <= 30; juz++) {
    const [firstAyah, lastAyah] = getJuzAyahRange(juz);
    if (report.kept.some((n) => n >= firstAyah && n <= lastAyah)) segmentedJuz.push(juz);
  }
  console.log(
    `[${reciter.id}] main format ${mainFormat} | replaced from alternates: ${report.replaced.length} | ` +
      `other-format ayahs kept: ${report.kept.length} (segmented Juz: ${segmentedJuz.join(", ") || "-"}) | ` +
      `unplayable, dropped: ${report.dropped.length}${report.dropped.length ? ` (${report.dropped.join(", ")})` : ""}`
  );

  const overrides = {};
  sources.forEach((url, i) => {
    if (url !== urls[i]) overrides[i + 1] = url;
  });
  return {
    // Format code 0 (the main format) is implied when a tuple has no fourth element.
    formats,
    ayahs: files.map((f) => {
      if (f.missing) return [0, 0, 0];
      const tuple = [f.start, f.end - f.start, Math.round(f.seconds * 1000)];
      const code = formats.indexOf(formatKey(f));
      return code > 0 ? [...tuple, code] : tuple;
    }),
    ...(Object.keys(overrides).length ? { urls: overrides } : {}),
  };
}

async function main() {
  await loadCache();
  console.log(`Probe cache: ${CACHE_FILE} (${Object.keys(cache).length} entries)`);

  let existing = { reciters: {} };
  try {
    existing = JSON.parse(await fs.readFile(OUT_FILE, "utf-8"));
  } catch {
    /* first run */
  }

  // Reciters run concurrently; the per-host limiters keep each CDN's load bounded.
  const selected = RECITERS_LIST.filter((r) => !ONLY_RECITER || r.id === ONLY_RECITER);
  const built = await Promise.all(selected.map(buildReciter));
  const reciters = { ...existing.reciters };
  selected.forEach((reciter, i) => {
    reciters[reciter.id] = built[i];
  });

  const body = JSON.stringify(reciters);
  const version = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)))
    .toString("hex")
    .slice(0, 10);

  // One reciter per line keeps the file diffable without pretty-printing 62k tuples.
  const lines = Object.entries(reciters).map(
    ([id, data]) => `    ${JSON.stringify(id)}: ${JSON.stringify(data)}`
  );
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    `{\n  "version": ${JSON.stringify(version)},\n  "reciters": {\n${lines.join(",\n")}\n  }\n}\n`
  );
  const { size } = await fs.stat(OUT_FILE);
  console.log(`\nWrote ${OUT_FILE} (${(size / 1024).toFixed(0)} KB, version ${version})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
