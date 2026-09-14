# Quran Ambience — Project Context & AI Agent Guide

Welcome to the **Quran Ambience** project context. This document serves as the central index and operating guide for AI agents and human developers working on this codebase.

---

## 📚 Core Project Documentation

Quick access to in-depth architectural and design documentation:

| Document                  | Description                                                                             | Direct Link                                                                                               |
| :------------------------ | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **System Architecture**   | Audio streaming engine, CDN failovers, lock-screen survival, server-side range streamer | 👉 [docs/architecture.md](./docs/architecture.md) _(or [docs/architechture.md](./docs/architechture.md))_ |
| **Design System & UI/UX** | Glassmorphic visual tokens, theme system, Arabic typography, responsive grid            | 👉 [docs/design.md](./docs/design.md) _(or [docs/desing.md](./docs/desing.md))_                           |
| **Engineering Rules**     | Strict TypeScript standards, DRY principles, React 19/Next.js 16 best practices         | 👉 [docs/rules.md](./docs/rules.md) _(or [docs/rule.md](./docs/rule.md))_                                 |

---

## 1. Project Overview

**Quran Ambience** is a serene web application combining continuous high-speed audio recitation of the Holy Quran with a customizable ambient nature sound mixer.

### Key Capabilities

- **Juz-Based Streaming**: Listen to any of the 30 Juz with automatic multi-surah sequencing.
- **15 Verified High-Speed Reciters**: Sourced from verified, high-speed CDNs (`mp3quran.net` and `quranicaudio.com`) with automated failover mirrors.
- **Lock-Screen Playback**: Background audio survival on mobile devices via W3C MediaSession API and synchronous ref patterns.
- **Interactive Ambient Mixer**: 5 nature sound tracks (Rain, Thunder, Birds, Droplets, Pine) with master presets and quick-reset.
- **Glassmorphic Theme Design**: Dynamic dark/light mode with rich micro-animations and spiritual color palettes.

---

## 2. Technology Stack

- **Framework**: [Next.js 16.1](https://nextjs.org/) (App Router)
- **UI Library**: [React 19.2](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with Vanilla CSS variables
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (`themeSlice`) + Custom React Hooks
- **Icons**: [Lucide React](https://lucide.dev/)
- **Media Controls**: W3C MediaSession API + Screen WakeLock API
- **Tooling**: ESLint 9, Prettier, Husky, Lint-Staged

---

## 3. High-Level Repository Map

```
web/
├── AGENT.md                         # Central agent context and navigation (this file)
├── docs/
│   ├── architecture.md              # Complete system architecture specification
│   ├── design.md                    # Design tokens, typography, and UI guidelines
│   └── rules.md                     # Engineering rules, TypeScript & DRY standards
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── juz-stream/route.ts  # Byte-range audio streaming server
│   │   │   └── hls/                 # Dynamic HLS playlist & segment proxy
│   │   ├── page.tsx                 # Main application page (/)
│   │   ├── layout.tsx               # Root application layout
│   │   └── providers.tsx            # Redux Provider wrapper
│   ├── components/
│   │   ├── QuranPlayer.tsx          # Main glassmorphic player component
│   │   ├── AmbianceMixer.tsx        # Ambient sound mixer component
│   │   └── ui/                      # GlassCard, Slider, IconButton, SectionHeader
│   ├── hooks/
│   │   ├── useQuranStreamAudio.ts   # Core audio stream hook (Juz sequencing & controls)
│   │   ├── useAudioMixer.ts         # Multi-track nature sound mixer hook
│   │   ├── useMediaSession.ts       # W3C MediaSession lock-screen integration
│   │   └── useTheme.ts              # Theme selector hook
│   ├── lib/
│   │   ├── quranStream.ts           # 15 Reciters, 30 Juz mapping, 114 Surahs, CDN URLs
│   │   ├── streamServer.ts          # Server-side byte mapping & stream pipe
│   │   ├── themes.ts                # Glassmorphic color tokens
│   │   └── utils.ts                 # ClassName merger (cn)
│   └── store/
│       ├── store.ts                 # Redux store configuration
│       └── themeSlice.ts            # Active theme slice
```

---

## 4. Essential Development Commands

All commands should be executed from the `web/` directory using `pnpm`:

```bash
# Start local development server
pnpm dev

# Perform TypeScript compilation check (Strict, zero errors)
pnpm type-check

# Run linter
pnpm lint

# Format code with Prettier
pnpm format

# Verify formatting without modifying files
pnpm format:check

# Create production build
pnpm build
```

---

## 5. Instructions for AI Coding Assistants

When adding features or modifying code in this codebase:

1. **Check Documentation First**: Consult [docs/architecture.md](./docs/architecture.md) and [docs/rules.md](./docs/rules.md) before altering audio playback or data models.
2. **Follow the DRY Principle**: Use centralized constants from [`src/lib/quranStream.ts`](./src/lib/quranStream.ts) and server helpers from [`src/lib/streamServer.ts`](./src/lib/streamServer.ts). Never duplicate reciter arrays or CDN URLs.
3. **Strict TypeScript Only**: No `any`. Explicitly type props, return signatures, and event arguments.
4. **Preserve Aesthetics**: Adhere to the glassmorphic theme system outlined in [docs/design.md](./docs/design.md). Use `GlassCard`, semantic Tailwind classes, and theme variables.
5. **Verify Before Completion**: Always run `pnpm type-check` and `pnpm lint` before marking any task as complete.
