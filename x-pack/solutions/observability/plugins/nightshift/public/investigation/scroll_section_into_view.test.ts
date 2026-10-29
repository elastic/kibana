/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scrollSectionIntoView } from './scroll_section_into_view';

const DURATION_MS = 250;
const SCROLL_AREA_TOP = 100;
const ELEMENT_OFFSET = 800;
const SCROLL_MARGIN_TOP = 24;
/** Where the scroll area has to end up for the element to sit at its scroll margin. */
const DESTINATION = ELEMENT_OFFSET - SCROLL_MARGIN_TOP;

/**
 * jsdom does no layout, so this stands in for it: a scroll area whose scroll position is clamped to
 * how tall its content currently is, and an element whose position follows that scroll position.
 */
const setUpScrollArea = (maxScrollTop: number) => {
  const scrollArea = document.createElement('div');
  scrollArea.style.overflowY = 'auto';
  const element = document.createElement('div');
  element.style.scrollMarginTop = `${SCROLL_MARGIN_TOP}px`;
  scrollArea.appendChild(element);
  document.body.appendChild(scrollArea);

  const layout = { maxScrollTop };
  let scrollTop = 0;
  Object.defineProperty(scrollArea, 'scrollTop', {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.min(Math.max(value, 0), layout.maxScrollTop);
    },
  });
  scrollArea.scrollTo = (({ top }: ScrollToOptions) => {
    scrollArea.scrollTop = top ?? 0;
  }) as typeof scrollArea.scrollTo;
  scrollArea.getBoundingClientRect = () => ({ top: SCROLL_AREA_TOP } as DOMRect);
  element.getBoundingClientRect = () =>
    ({ top: SCROLL_AREA_TOP + ELEMENT_OFFSET - scrollArea.scrollTop } as DOMRect);

  return { scrollArea, element, layout };
};

describe('scrollSectionIntoView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('lands the element at its scroll margin, below the top of its scroll area', () => {
    const { scrollArea, element } = setUpScrollArea(5000);
    const onDone = jest.fn();

    scrollSectionIntoView(element, DURATION_MS, onDone);
    jest.advanceTimersByTime(DURATION_MS * 2);

    expect(scrollArea.scrollTop).toBe(DESTINATION);
    expect(element.getBoundingClientRect().top).toBe(SCROLL_AREA_TOP + SCROLL_MARGIN_TOP);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('scrolls gradually rather than jumping straight to the end', () => {
    const { scrollArea, element } = setUpScrollArea(5000);

    scrollSectionIntoView(element, DURATION_MS);
    jest.advanceTimersByTime(DURATION_MS / 2);

    expect(scrollArea.scrollTop).toBeGreaterThan(0);
    expect(scrollArea.scrollTop).toBeLessThan(DESTINATION);
  });

  it('follows a page that is still growing, as a closed section opens', () => {
    // Only 300px can be scrolled at first, so the element cannot yet reach its margin.
    const { scrollArea, element, layout } = setUpScrollArea(300);
    const onDone = jest.fn();

    scrollSectionIntoView(element, DURATION_MS, onDone);
    jest.advanceTimersByTime(DURATION_MS / 2);
    expect(scrollArea.scrollTop).toBeLessThanOrEqual(300);

    // The section finishes opening, and the page can now scroll far enough.
    layout.maxScrollTop = 5000;
    jest.advanceTimersByTime(DURATION_MS * 2);

    expect(scrollArea.scrollTop).toBe(DESTINATION);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops without reporting done when it is cancelled', () => {
    const { scrollArea, element } = setUpScrollArea(5000);
    const onDone = jest.fn();

    const cancel = scrollSectionIntoView(element, DURATION_MS, onDone);
    jest.advanceTimersByTime(50);
    cancel();
    const stoppedAt = scrollArea.scrollTop;
    jest.advanceTimersByTime(DURATION_MS * 2);

    expect(scrollArea.scrollTop).toBe(stoppedAt);
    expect(onDone).not.toHaveBeenCalled();
  });
});
