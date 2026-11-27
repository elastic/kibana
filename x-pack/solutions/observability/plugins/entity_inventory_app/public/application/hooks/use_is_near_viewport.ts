/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { getScrollContainer } from '@kbn/core-chrome-layout';

/** How far outside the viewport an element still counts as near, so it loads before it scrolls in. */
export const NEAR_VIEWPORT_ROOT_MARGIN = '200px';

/**
 * The layout's scroll container, or `null` when there is none and the page itself scrolls. An
 * observer clips an element at every scrolling ancestor, so the margin only reaches past the edge
 * of that container when the observer is rooted on it. Kibana scrolls inside its layout container,
 * not the window.
 */
const getObserverRoot = (): Element | null => {
  const scrollContainer = getScrollContainer();
  return scrollContainer === document.documentElement ? null : scrollContainer;
};

/**
 * Whether `element` is in view, or within `NEAR_VIEWPORT_ROOT_MARGIN` of the edge of the area it
 * scrolls in, now. Where the browser has no `IntersectionObserver` it is always true, so nothing is
 * held back.
 */
export const useIsNearViewport = (element: Element | null): boolean => {
  const isSupported = typeof IntersectionObserver !== 'undefined';
  const [isNear, setIsNear] = useState(!isSupported);

  useEffect(() => {
    if (!isSupported || !element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          setIsNear(lastEntry.isIntersecting);
        }
      },
      { root: getObserverRoot(), rootMargin: NEAR_VIEWPORT_ROOT_MARGIN }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, isSupported]);

  return isNear;
};
