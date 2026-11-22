import { useEffect, useRef } from "react";

/**
 * Lets an open drawer be dismissed with Escape or the browser / Android back button.
 *
 * Opening adds a history entry, so "back" closes the drawer instead of leaving the page;
 * the Android WebView app maps the hardware back button to `history.back()`.
 */
export function useDrawerDismiss(isOpen: boolean, onDismiss: () => void): void {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!isOpen) return;
    const marker = Date.now();
    window.history.pushState({ ...window.history.state, drawer: marker }, "");
    let closedByHistory = false;

    const onPopState = () => {
      closedByHistory = true;
      onDismissRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismissRef.current();
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
      // Closed from the UI: drop the history entry added on open.
      if (!closedByHistory && window.history.state?.drawer === marker) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
