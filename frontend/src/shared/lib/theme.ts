/**
 * Applies the OS colour-scheme preference by toggling the `dark` class on
 * <html> (Tailwind is configured with `darkMode: ['class']`), and keeps it in
 * sync if the user changes their system theme.
 */
export function applySystemTheme(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (dark: boolean): void => {
    document.documentElement.classList.toggle('dark', dark);
  };
  apply(media.matches);
  media.addEventListener('change', (event) => apply(event.matches));
}
