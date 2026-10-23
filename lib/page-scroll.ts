export const PAGE_SCROLL_SEEK = "portfolio:scroll-seek";

/** Route programmatic navigation through the active scroll controller. */
export function seekPage(top: number, smooth = false) {
  const event = new CustomEvent(PAGE_SCROLL_SEEK, { detail: { top, smooth }, cancelable: true });
  if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: smooth ? "smooth" : "instant" });
}
