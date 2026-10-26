/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { APP_HEADER_SELECTOR, TIMELINE_BAR_SELECTOR } from '../use_pinned_bars_height';

/**
 * Whether the anchor is wholly in the part of the view the pinned bars leave visible. A tour
 * popover follows its anchor while the page scrolls, over the bars and off screen.
 */
export const useIsAnchorInView = (anchor: string, isAnchorMounted: boolean): boolean => {
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    const element = isAnchorMounted ? document.querySelector(anchor) : null;
    if (!element) return;
    const headerBottom =
      document.querySelector(APP_HEADER_SELECTOR)?.getBoundingClientRect().bottom ?? 0;
    const barTop =
      document.querySelector(TIMELINE_BAR_SELECTOR)?.getBoundingClientRect().top ??
      window.innerHeight;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.intersectionRatio === 1),
      {
        rootMargin: `-${headerBottom}px 0px -${window.innerHeight - barTop}px 0px`,
        threshold: 1,
      }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [anchor, isAnchorMounted]);

  return isInView;
};
