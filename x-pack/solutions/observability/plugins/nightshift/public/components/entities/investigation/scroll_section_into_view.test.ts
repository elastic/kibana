/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scrollSectionIntoView } from './scroll_section_into_view';

describe('scrollSectionIntoView', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lands the element at its scroll margin, following a page that is still growing', () => {
    // jsdom does no layout, so fake a scroll area that cannot scroll past the page's height so far.
    let maxScroll = 300;
    let scrollTop = 0;
    const scrollArea = document.createElement('div');
    scrollArea.style.overflowY = 'auto';
    const element = document.createElement('div');
    element.style.scrollMarginTop = '24px';
    scrollArea.appendChild(element);
    document.body.appendChild(scrollArea);
    Object.defineProperty(scrollArea, 'scrollTop', {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = Math.min(Math.max(value, 0), maxScroll);
      },
    });
    scrollArea.scrollTo = (({ top }: ScrollToOptions) => {
      scrollArea.scrollTop = top ?? 0;
    }) as typeof scrollArea.scrollTo;
    scrollArea.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
    element.getBoundingClientRect = () => ({ top: 100 + 800 - scrollTop } as DOMRect);
    const onDone = jest.fn();

    scrollSectionIntoView(element, 250, onDone);
    jest.advanceTimersByTime(100);
    expect(scrollTop).toBeLessThanOrEqual(300);
    maxScroll = 5000; // the closed section has finished opening
    jest.advanceTimersByTime(300);

    expect(scrollTop).toBe(800 - 24);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
