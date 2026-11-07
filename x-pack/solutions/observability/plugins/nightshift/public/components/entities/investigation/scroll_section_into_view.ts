/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const easeOutCubic = (progress: number): number => 1 - Math.pow(1 - progress, 3);

const getScrollParent = (element: HTMLElement): HTMLElement | null => {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
      return parent;
    }
  }
  return null;
};

/**
 * Scrolls an element to the top of its scroll area, honouring its `scroll-margin-top`, like
 * `scrollIntoView({ block: 'start' })`. Unlike the browser's smooth scroll, which fixes its
 * destination when it starts, it re-reads the element's position every frame. A section that is
 * still opening, and so still making the page taller, is therefore followed to its final spot.
 *
 * Give it EUI's accordion duration, so a closed section finishes opening as the scroll lands.
 * `onDone` is called once the scroll has landed, or was cut short by the user. Returns a function
 * that cancels the scroll without calling `onDone`, for when something else takes over.
 */
export const scrollSectionIntoView = (
  element: HTMLElement,
  durationMs: number,
  onDone?: () => void
): (() => void) => {
  const scrollParent = getScrollParent(element);
  const scroller = scrollParent ?? document.scrollingElement ?? document.documentElement;
  const scrollMarginTop = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Where the scroll area has to be scrolled to for the element to sit at its margin. */
  const getDestination = () =>
    scroller.scrollTop +
    element.getBoundingClientRect().top -
    ((scrollParent?.getBoundingClientRect().top ?? 0) + scrollMarginTop);

  const startTop = scroller.scrollTop;
  const startTime = performance.now();
  let frameId = 0;

  const stop = () => {
    window.cancelAnimationFrame(frameId);
    window.removeEventListener('wheel', takeOver);
    window.removeEventListener('touchmove', takeOver);
  };
  // Someone scrolling by hand takes over from the animation.
  function takeOver() {
    stop();
    onDone?.();
  }

  const step = (now: number) => {
    const progress =
      reducedMotion || !(durationMs > 0) ? 1 : Math.min(1, (now - startTime) / durationMs);
    const destination = getDestination();
    scroller.scrollTo({
      top: startTop + (destination - startTop) * easeOutCubic(progress),
      behavior: 'instant',
    });
    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
      return;
    }
    stop();
    onDone?.();
  };

  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('touchmove', takeOver, { passive: true });
  frameId = window.requestAnimationFrame(step);

  return stop;
};
