/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { IntersectionObserverMockControls } from '../../__fixtures__/intersection_observer_mock';
import { installIntersectionObserverMock } from '../../__fixtures__/intersection_observer_mock';
import { NEAR_VIEWPORT_ROOT_MARGIN, useIsNearViewport } from './use_is_near_viewport';

describe('useIsNearViewport', () => {
  describe('with IntersectionObserver', () => {
    let observer: IntersectionObserverMockControls;

    beforeEach(() => {
      observer = installIntersectionObserverMock();
    });

    afterEach(() => {
      observer.restore();
    });

    it('is false until the element intersects, and follows it in and out of range', () => {
      const element = document.createElement('div');
      const { result } = renderHook(() => useIsNearViewport(element));
      expect(result.current).toBe(false);

      act(() => observer.setIntersecting(element, true));
      expect(result.current).toBe(true);

      act(() => observer.setIntersecting(element, false));
      expect(result.current).toBe(false);
    });

    it('is false while there is no element yet', () => {
      const { result } = renderHook(() => useIsNearViewport(null));

      expect(result.current).toBe(false);
    });

    it('watches with a margin around the viewport, so a section just below the fold is near', () => {
      const element = document.createElement('div');
      renderHook(() => useIsNearViewport(element));

      expect(observer.getRootMargins(element)).toEqual([NEAR_VIEWPORT_ROOT_MARGIN]);
    });

    it('measures the margin from the nearest scrollable ancestor, which clips the element before the viewport does', () => {
      const scroller = document.createElement('div');
      scroller.style.overflowY = 'auto';
      // JSDOM has no layout, so say the container really scrolls.
      Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
      Object.defineProperty(scroller, 'clientHeight', { value: 500 });
      const wrapper = document.createElement('div');
      const element = document.createElement('div');
      wrapper.appendChild(element);
      scroller.appendChild(wrapper);
      document.body.appendChild(scroller);

      renderHook(() => useIsNearViewport(element));

      expect(observer.getRoots(element)).toEqual([scroller]);
      scroller.remove();
    });

    it('skips an ancestor that allows scrolling but has nothing to scroll, and watches from the viewport', () => {
      const idle = document.createElement('div');
      idle.style.overflowY = 'auto';
      const element = document.createElement('div');
      idle.appendChild(element);
      document.body.appendChild(idle);

      renderHook(() => useIsNearViewport(element));

      expect(observer.getRoots(element)).toEqual([null]);
      idle.remove();
    });

    it('watches from the viewport when no ancestor scrolls', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      renderHook(() => useIsNearViewport(element));

      expect(observer.getRoots(element)).toEqual([null]);
      element.remove();
    });

    it('stops watching the element when it unmounts', () => {
      const element = document.createElement('div');
      const { unmount } = renderHook(() => useIsNearViewport(element));
      expect(observer.getRootMargins(element)).toHaveLength(1);

      unmount();

      expect(observer.getRootMargins(element)).toHaveLength(0);
    });
  });

  it('is true where IntersectionObserver does not exist, so nothing is held back', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useIsNearViewport(element));

    expect(result.current).toBe(true);
  });
});
