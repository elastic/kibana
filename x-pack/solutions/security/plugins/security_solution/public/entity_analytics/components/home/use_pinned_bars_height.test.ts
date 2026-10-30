/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { usePinnedBarsHeight } from './use_pinned_bars_height';

/** Reports a size change of the observed bars, as the browser would. */
let reportResize: () => void;
let observedBars: Element[];

const addBar = (testSubj: string, height: number): HTMLElement => {
  const bar = document.createElement('div');
  bar.setAttribute('data-test-subj', testSubj);
  bar.getBoundingClientRect = () => ({ height } as DOMRect);
  document.body.appendChild(bar);
  return bar;
};

const setBarHeight = (bar: HTMLElement, height: number) => {
  bar.getBoundingClientRect = () => ({ height } as DOMRect);
};

const renderPinnedBarsHeight = () => {
  const view = renderHook(({ isFullScreen }) => usePinnedBarsHeight(isFullScreen), {
    initialProps: { isFullScreen: false },
  });
  act(() => view.result.current[1](document.createElement('div')));
  act(() => reportResize());
  return view;
};

describe('usePinnedBarsHeight', () => {
  let originalResizeObserver: typeof ResizeObserver;

  beforeAll(() => {
    originalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      observedBars = [];
      reportResize = () => callback([], {} as ResizeObserver);
      return {
        observe: (bar: Element) => observedBars.push(bar),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    }) as unknown as typeof ResizeObserver;
  });

  afterAll(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('sums the page header and timeline bar heights', () => {
    addBar(APP_HEADER_TEST_SUBJECTS.root, 65);
    addBar('timeline-bottom-bar-container', 57);

    const { result } = renderPinnedBarsHeight();

    expect(result.current[0]).toBe(122);
  });

  it('measures nothing until the element given the ref mounts', () => {
    addBar(APP_HEADER_TEST_SUBJECTS.root, 65);

    const { result } = renderHook(() => usePinnedBarsHeight(false));

    expect(window.ResizeObserver).not.toHaveBeenCalled();
    expect(result.current[0]).toBe(0);
  });

  it('measures the remounted header and the regrown timeline bar on leaving full screen', () => {
    const header = addBar(APP_HEADER_TEST_SUBJECTS.root, 65);
    const timelineBar = addBar('timeline-bottom-bar-container', 57);
    const { result, rerender } = renderPinnedBarsHeight();

    // Full screen unmounts the header and collapses the timeline bar.
    rerender({ isFullScreen: true });
    header.remove();
    setBarHeight(timelineBar, 1);
    expect(result.current[0]).toBe(122);

    // Leaving it mounts a new header; the bar regrows only afterwards.
    const remountedHeader = addBar(APP_HEADER_TEST_SUBJECTS.root, 65);
    rerender({ isFullScreen: false });
    expect(observedBars).toEqual([remountedHeader, timelineBar]);
    act(() => reportResize());
    expect(result.current[0]).toBe(66);

    setBarHeight(timelineBar, 57);
    act(() => reportResize());
    expect(result.current[0]).toBe(122);
  });
});
