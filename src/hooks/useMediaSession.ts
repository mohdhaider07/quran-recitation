import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaSessionMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork?: MediaImage[];
}

/** Subset of MediaSessionAction we actively support across this app. */
export type SupportedMediaSessionAction =
  "play" | "pause" | "stop" | "previoustrack" | "nexttrack" | "seekbackward" | "seekforward";

export type MediaSessionHandlers = Partial<
  Record<SupportedMediaSessionAction, MediaSessionActionHandler | null>
>;

export interface UseMediaSessionOptions {
  /** Metadata shown on the Android lock screen / notification. */
  metadata: MediaSessionMetadata;
  /** Current playback state — kept in sync with the OS indicator. */
  playbackState: MediaSessionPlaybackState;
  /**
   * Position for the lock-screen seek bar.
   * Pass `null` (or omit) when duration is not yet known.
   */
  positionState?: MediaPositionState | null;
  /**
   * Action handlers for lock-screen / headset hardware buttons. A `null` or missing handler
   * hides that button. Uses a ref-delegate pattern internally, so callers do NOT need to
   * memoize these with useCallback — the hook always calls the latest version.
   */
  handlers?: MediaSessionHandlers;
}

// ─── Feature detection ────────────────────────────────────────────────────────

/** True only in a browser context that supports the Media Session API. */
const isMediaSessionSupported = typeof navigator !== "undefined" && "mediaSession" in navigator;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useMediaSession`
 *
 * Manages the full W3C Media Session API lifecycle for a component.
 *
 * **Why this matters for Android background audio:**
 * When a page has an active Media Session with registered handlers, the Android
 * OS routes its audio through the system's media framework. This is what keeps
 * playback alive when the screen locks — without it, the browser tab / renderer
 * is treated as a generic background page and its audio pipeline is suspended.
 *
 * The Media Session is a single page-wide object, so call this hook from exactly one place.
 *
 * @example
 * ```ts
 * useMediaSession({
 *   metadata: { title: 'Juz 1', artist: 'Mishary Rashid Alafasy', album: 'Holy Quran' },
 *   playbackState: isPlaying ? 'playing' : 'paused',
 *   positionState: duration ? { duration, position: currentTime, playbackRate: 1 } : null,
 *   handlers: { play: onPlay, pause: onPause, nexttrack: onNext },
 * });
 * ```
 */
export function useMediaSession({
  metadata,
  playbackState,
  positionState,
  handlers,
}: UseMediaSessionOptions): void {
  // ── Handler ref-delegate ────────────────────────────────────────────────────
  // Storing handlers in a ref means setActionHandler only runs when the set of available
  // actions changes, while every invocation still calls the most up-to-date handler.
  const handlersRef = useRef<MediaSessionHandlers | undefined>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const activeActions = (Object.keys(handlers ?? {}) as SupportedMediaSessionAction[])
    .filter((action) => handlers?.[action])
    .sort()
    .join(",");

  useEffect(() => {
    if (!isMediaSessionSupported || !activeActions) return;
    const actions = activeActions.split(",") as SupportedMediaSessionAction[];

    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, (details) => {
          // Call the current handler from the ref, not the stale closure.
          handlersRef.current?.[action]?.(details);
        });
      } catch {
        // Not every browser/version supports every action — fail silently.
      }
    });

    return () => {
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      });
    };
  }, [activeActions]);

  // ── Metadata ────────────────────────────────────────────────────────────────
  // Destructure to primitive deps so the effect re-runs only when actual values
  // change, not on every render when the caller constructs a new object literal.
  const { title, artist, album, artwork } = metadata;
  const artworkKey = JSON.stringify(artwork ?? []);
  useEffect(() => {
    if (!isMediaSessionSupported) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: JSON.parse(artworkKey) as MediaImage[],
    });
  }, [title, artist, album, artworkKey]);

  // ── Playback state ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMediaSessionSupported) return;
    navigator.mediaSession.playbackState = playbackState;
  }, [playbackState]);

  // ── Position state (lock-screen seek bar) ───────────────────────────────────
  // Destructure to primitives for the same reason as metadata above.
  const duration = positionState?.duration;
  const position = positionState?.position;
  const playbackRate = positionState?.playbackRate;
  useEffect(() => {
    if (!isMediaSessionSupported) return;
    try {
      if (!duration) {
        navigator.mediaSession.setPositionState(); // Clears a previously shown seek bar.
        return;
      }
      navigator.mediaSession.setPositionState({
        duration,
        // setPositionState throws when position exceeds duration.
        position: Math.min(Math.max(position ?? 0, 0), duration),
        playbackRate: playbackRate ?? 1,
      });
    } catch {
      // setPositionState is not universally supported — fail silently.
    }
  }, [duration, position, playbackRate]);
}
