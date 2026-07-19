import { useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaSessionMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork?: MediaImage[];
}

/** Subset of MediaSessionAction we actively support across this app. */
export type SupportedMediaSessionAction =
  | 'play'
  | 'pause'
  | 'stop'
  | 'previoustrack'
  | 'nexttrack'
  | 'seekbackward'
  | 'seekforward';

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
   * Action handlers for lock-screen / headset hardware buttons.
   * Uses a ref-delegate pattern internally, so callers do NOT need to
   * memoize these with useCallback — the hook always calls the latest version.
   */
  handlers?: MediaSessionHandlers;
}

// ─── Feature detection ────────────────────────────────────────────────────────

/** True only in a browser context that supports the Media Session API. */
const isMediaSessionSupported =
  typeof navigator !== 'undefined' && 'mediaSession' in navigator;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useMediaSession`
 *
 * Manages the full W3C Media Session API lifecycle for a component.
 *
 * **Why this matters for Android background audio:**
 * When a page has an active Media Session with registered handlers, the Android
 * OS routes its audio through the system's media framework. This is what keeps
 * playback alive when the screen locks — without it, the WebView renderer
 * is treated as a generic background page and its audio pipeline is suspended.
 *
 * **DRY design:**
 * All Media Session concerns (metadata, playback state, position state, action
 * handlers) are managed in one place. Consumers just pass their current state
 * and callbacks — no try/catch, no cleanup, no API knowledge required.
 *
 * @example
 * ```ts
 * useMediaSession({
 *   metadata: { title: 'Ayah 1', artist: 'Abdul Basit', album: 'Juz 1' },
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
  // Storing handlers in a ref means we register action handlers exactly once
  // (avoiding repeated setActionHandler calls) while always calling the most
  // up-to-date handler. This also means callers don't need useCallback.
  const handlersRef = useRef<MediaSessionHandlers | undefined>(handlers);
  // Always keep the ref in sync with the latest prop value, synchronously.
  handlersRef.current = handlers;

  // Register once; delegate every invocation to the ref.
  useEffect(() => {
    if (!isMediaSessionSupported || !handlers) return;

    const actions = Object.keys(handlers) as SupportedMediaSessionAction[];

    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, (...args) => {
          // Call the current handler from the ref, not the stale closure.
          (handlersRef.current?.[action] as MediaSessionActionHandler | null | undefined)
            ?.(...args);
        });
      } catch {
        // Not every browser/version supports every action — fail silently.
      }
    });

    return () => {
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch { /* ignore */ }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMediaSessionSupported]); // intentionally runs once; ref provides freshness

  // ── Metadata ────────────────────────────────────────────────────────────────
  // Destructure to primitive deps so the effect re-runs only when actual values
  // change, not on every render when the caller constructs a new object literal.
  const { title, artist, album } = metadata;
  useEffect(() => {
    if (!isMediaSessionSupported) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album });
  }, [title, artist, album]);

  // ── Playback state ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMediaSessionSupported) return;
    navigator.mediaSession.playbackState = playbackState;
  }, [playbackState]);

  // ── Position state (lock-screen seek bar) ───────────────────────────────────
  // Destructure to primitives for the same reason as metadata above.
  const duration     = positionState?.duration;
  const position     = positionState?.position;
  const playbackRate = positionState?.playbackRate;
  useEffect(() => {
    if (!isMediaSessionSupported || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position:     position     ?? 0,
        playbackRate: playbackRate ?? 1,
      });
    } catch {
      // setPositionState is not universally supported — fail silently.
    }
  }, [duration, position, playbackRate]);
}
