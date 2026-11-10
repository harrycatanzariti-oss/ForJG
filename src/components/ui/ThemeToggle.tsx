/**
 * Header button that flips between light and dark.
 * The full choice (including "match my device") lives in Settings.
 */
import { saveSettings } from '~/lib/settings';

export default function ThemeToggle() {
  const toggle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    saveSettings({ theme: isDark ? 'light' : 'dark' });
  };
  // The icon shown is decided by CSS (the `dark` class on <html>), so the
  // server-rendered HTML is always correct and nothing flickers on load.
  return (
    <button
      type="button"
      onClick={toggle}
      class="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
      aria-label="Switch between light and dark mode"
    >
      {/* Moon (shown in light mode) */}
      <svg
        class="size-5 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke-linejoin="round" />
      </svg>
      {/* Sun (shown in dark mode) */}
      <svg
        class="hidden size-5 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}
