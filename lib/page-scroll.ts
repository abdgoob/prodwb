export const PAGE_SCROLL_SEEK = "portfolio:scroll-seek";

/** Route programmatic navigation through the active scroll controller. */
export function seekPage(top: number) {
  const event = new CustomEvent<number>(PAGE_SCROLL_SEEK, { detail: top, cancelable: true });
  if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: "instant" });
}
