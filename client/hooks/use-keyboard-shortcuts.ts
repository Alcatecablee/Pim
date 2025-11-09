import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatches = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatches = shortcut.meta === undefined || shortcut.meta === event.metaKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
      });

      if (matchingShortcut) {
        const target = event.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

        if (matchingShortcut.key === "/" || matchingShortcut.key === "Escape" || matchingShortcut.key === "?" || !isInput) {
          if (matchingShortcut.preventDefault !== false) {
            event.preventDefault();
          }
          matchingShortcut.action();
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  if (shortcut.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? "" : "+");
}
