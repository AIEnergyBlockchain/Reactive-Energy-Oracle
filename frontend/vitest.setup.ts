import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? false : false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const rect = originalGetBoundingClientRect.call(this);
  if (rect.width === 0 && rect.height === 0) {
    return {
      ...rect,
      width: 800,
      height: 280,
      top: 0,
      left: 0,
      right: 800,
      bottom: 280,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect;
  }
  return rect;
};
