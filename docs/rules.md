# Engineering Rules & Coding Guidelines — Peaceful Quran

[← Back to AGENT.md](../AGENT.md)

---

## 1. Strict TypeScript Standards

All code within this repository must adhere to strict typing standards to prevent runtime exceptions and ensure maintainability:

1. **Zero `any` Policy**: Do not use `any`. Use explicit interfaces, generic parameters, or `unknown` with narrowing.
2. **Explicit Interfaces**: All entity models (`Reciter`, `SurahMeta`, `JuzByteMap`, `StreamSlice`) must have clear TypeScript definitions exported from their domain source (`src/lib/quranStream.ts` or `src/lib/streamServer.ts`).
3. **Strict Null & Undefined Handling**: Check for `null` and `undefined` explicitly when querying collections or DOM elements.
4. **Type-Only Imports**: Use `import type { ... }` when importing types only, avoiding bundle bloat.

---

## 2. DRY (Don't Repeat Yourself) Architecture

1. **Single Source of Truth**:
   - Audio constants (15 CDN reciters, 30 Juz-to-Surahs maps, 114 Surah metadata records) reside exclusively in [`src/lib/quranStream.ts`](../src/lib/quranStream.ts).
   - Server-side byte mapping and stream piping reside in [`src/lib/streamServer.ts`](../src/lib/streamServer.ts).
   - Never duplicate CDN URLs, reciter definitions, or math formulas across pages or components.
2. **Decoupled Business Logic**:
   - UI components (`QuranPlayer.tsx`, `AmbianceMixer.tsx`) must strictly serve as **presentation layers**.
   - All audio state, lifecycle listeners, duration calculations, and media session interactions must be encapsulated within custom hooks (`useQuranStreamAudio.ts`, `useAudioMixer.ts`).
   - Hooks should return descriptive, typed state properties and action handlers.

---

## 3. React 19 & Next.js 16 Best Practices

1. **Component Directives**: Explicitly mark client-side interactive components with `"use client";` at line 1.
2. **Preventing Stale Closures in Audio Callbacks**:
   - When registering browser audio listeners (`ontimeupdate`, `onended`, `onerror`), never rely on closed-over state variables that become stale.
   - Use the **Synchronous Ref Pattern** (`useRef` synced via `useEffect`) to read latest values inside callbacks without re-attaching listeners on every render.
3. **Resource Lifecycle & Cleanup**:
   - Always implement proper cleanup functions in `useEffect`:
     - Pause and detach audio sources.
     - Set audio listeners (`ontimeupdate`, `onended`, etc.) to `null`.
     - Revoke any temporary object URLs.
     - Release any active WakeLocks.
4. **Hook Dependencies**: Maintain exhaustive dependency arrays. If a callback does not need to change, wrap it in `useCallback`.

---

## 4. Audio Streaming & Performance Rules

1. **Metadata Probing**: When calculating durations for multiple tracks, set `preload = "metadata"` on probe instances to minimize network bandwidth consumption.
2. **Safe Fallback CDN Routing**: Every CDN request must implement fallback mechanisms to recover gracefully from upstream failures without crashing playback.
3. **Resilient Streaming**: Server-side streams must handle client disconnects (`AbortSignal`) cleanly by terminating readers and closing controllers safely.
4. **No Draggable Juz Progress Seeking**: Per current product specs, the Juz progress bar is strictly display-only (`disabled`, `pointer-events-none`) to reflect progress without arbitrary byte scrubbing.

---

## 5. Code Quality, Verification & Tooling

Before creating commits or pull requests, the following checks must succeed:

```bash
# 1. Verify TypeScript types (Zero errors required)
pnpm type-check

# 2. Run ESLint (Zero errors and zero unaddressed warnings)
pnpm lint

# 3. Format code with Prettier
pnpm format
```

- **Husky & Lint-Staged**: Git pre-commit hooks are configured to enforce linting and formatting automatically.
- **Imports Sorting**: Group external package imports first, followed by internal `@/...` path aliases, followed by relative imports.

---

[← Back to AGENT.md](../AGENT.md)
