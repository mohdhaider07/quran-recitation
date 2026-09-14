# System Architecture — Quran Ambience

[← Back to AGENT.md](../AGENT.md)

---

## 1. Executive Overview

**Quran Ambience** is a modern, high-performance web application designed to deliver an immersive spiritual experience. It seamlessly blends high-speed CDN audio streaming of the Holy Quran (recitation organized by Juz and Surah) with a customizable multi-channel ambient nature sound mixer.

```mermaid
graph TD
    Client[Browser Client: Next.js 16 + React 19]
    PlayerHook[useQuranStreamAudio Hook]
    MixerHook[useAudioMixer Hook]
    MediaSession[W3C MediaSession API]
    CDNAudio[(High-Speed CDNs: mp3quran.net / quranicaudio.com)]
    BackendAPI[/api/juz-stream: Byte Range Streamer]
    HLSAPI[/api/hls/playlist: Safari VOD M3U8]
    NatureSounds[(Local Ambient Nature Audio Files)]

    Client --> PlayerHook
    Client --> MixerHook
    PlayerHook --> MediaSession
    PlayerHook --> CDNAudio
    PlayerHook -. Optional Failover .-> BackendAPI
    MixerHook --> NatureSounds
    MediaSession --> PlayerHook
    HLSAPI --> CDNAudio
```

---

## 2. Audio Streaming Architecture

### 2.1 Direct High-Speed CDN Pipeline

Audio is sourced from verified, high-speed, CORS-exempt content delivery networks (`server*.mp3quran.net` and `download.quranicaudio.com`).

- **15 Verified Reciters**: Curated reciters with primary high-speed CDNs and secondary fallback mirrors.
- **Failover Mechanism**: If a primary CDN URL returns an error or network drop, the audio engine automatically fails over to the reciter's `fallbackServer`.
- **Pre-Probbed Metadata Durations**: When a Juz is selected (containing multiple Surahs mapped via `JUZ_SURAHS_MAP`), lightweight background probe objects resolve the duration of each Surah. This calculates `totalJuzDuration` and `totalJuzElapsedTime` across the entire Juz.

### 2.2 Continuous Multi-Surah Juz Sequencing

A single Juz spans multiple Surahs (e.g., Juz 1 contains Surah 1 and Surah 2; Juz 30 contains Surahs 78 to 114).

- Audio automatically advances to the next Surah when the current one ends (`audio.onended`).
- The transition maintains user playback state without hitching.

### 2.3 Lock-Screen & Background Playback Survival

Maintaining continuous background audio across mobile platforms (especially Android and iOS) is achieved through a multi-layered strategy:

1. **W3C MediaSession API (`src/hooks/useMediaSession.ts`)**: Registers system-level action handlers (`play`, `pause`, `previoustrack` for Previous Juz, `nexttrack` for Next Juz) and position state. This registers the web tab with the OS media pipeline so it is not suspended when the screen locks.
2. **Synchronous Ref Delegation**: Callback closures store state in mutable refs (`isPlayingRef`, `juzRef`, `reciterIdRef`) to eliminate stale closures when lock-screen hardware events fire.
3. **Screen WakeLock API**: Requests screen wake lock when playing to prevent premature OS sleep during active sessions.

### 2.4 Server-Side Streaming Engine (`/api/juz-stream`)

A dedicated Next.js Route Handler (`src/app/api/juz-stream/route.ts`) powered by `src/lib/streamServer.ts`:

- **Byte Map Generation (`JuzByteMap`)**: Resolves cumulative byte offsets for all Surahs in a Juz.
- **In-Memory Caching (`surahSizeCache`, `juzByteMapCache`)**: Instantaneous sub-millisecond response on subsequent requests.
- **HTTP 206 Partial Content (Range Seeking)**: Slices byte offsets seamlessly across Surah boundaries, allowing standard media players to stream the entire Juz as a single continuous MP3 file.
- **Resilient Web Stream**: Pipes remote CDN audio through `ReadableStream` chunks with client abort handling.

### 2.5 Safari HLS Dynamic Playlist (`/api/hls/playlist`)

For Apple WebKit platforms, the application can generate dynamic `#EXTM3U` VOD playlists. Safari's native media engine handles segment transitions natively in C++, bypassing JavaScript suspension during sleep.

---

## 3. Ambient Sound Mixer Architecture

The ambient mixer (`src/hooks/useAudioMixer.ts` & `src/components/AmbianceMixer.tsx`) operates in parallel with Quran recitation:

- **5 Concurrent Sound Channels**: Rain, Thunder, Forest Birds, Stream Water, and Pine Trees.
- **Independent Volume Control**: Each track maintains an independent gain level between 0% and 100%.
- **Master Audio Presets**: Quick-select presets (`Rain`, `Night`, `Birds`, `Calm`) for instant atmospheric immersion.
- **Independent Audio Instances**: Managed independently so adjusting ambient sound volumes never interrupts or distorts recitation.

---

## 4. State Management & Data Flow

```
[UI Components]
       │
       ├── useQuranStreamAudio ───► HTMLAudioElement + MediaSession
       │                                  ▲
       │                                  │
       │                           quranStream.ts (Data & Mappings)
       │
       ├── useAudioMixer ─────────► Multi-channel Audio Pool
       │
       └── Redux Store ───────────► themeSlice (Active Theme State)
```

- **Audio State**: Encapsulated cleanly within custom hooks (`useQuranStreamAudio`, `useAudioMixer`) rather than global Redux, ensuring zero unnecessary re-renders of unrelated UI trees.
- **Theme State**: Persisted globally via Redux Toolkit (`themeSlice.ts`), supporting instant theme swapping across all glassmorphic components.

---

## 5. Directory Structure & Key Responsibilities

```
web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── juz-stream/route.ts  # Byte-range audio stream server
│   │   │   └── hls/                 # HLS VOD playlist generator
│   │   ├── layout.tsx               # Root Next.js layout & font setup
│   │   ├── page.tsx                 # Main application page (/)
│   │   └── providers.tsx            # Redux Provider wrapper
│   ├── components/
│   │   ├── QuranPlayer.tsx          # Main glassmorphic player card
│   │   ├── AmbianceMixer.tsx        # Nature sounds mixer card
│   │   └── ui/                      # Atomic UI design components
│   ├── hooks/
│   │   ├── useQuranStreamAudio.ts   # Core stream playback hook
│   │   ├── useAudioMixer.ts         # Multi-channel ambient mixer hook
│   │   ├── useMediaSession.ts       # W3C MediaSession API integration
│   │   └── useTheme.ts              # Theme selector hook
│   ├── lib/
│   │   ├── quranStream.ts           # Types, reciters, mappings, formatters
│   │   ├── streamServer.ts          # Server-side byte mapping & stream pipe
│   │   ├── themes.ts                # Theme token definitions
│   │   └── utils.ts                 # ClassName merging (cn) utility
│   └── store/                       # Redux store & slices
└── docs/                            # Architectural, design, & rule specs
```

---

[← Back to AGENT.md](../AGENT.md)
