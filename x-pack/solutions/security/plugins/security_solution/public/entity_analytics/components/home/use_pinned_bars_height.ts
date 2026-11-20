/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { sumBy } from 'lodash';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

/**
 * The bars pinned over the page while it scrolls: the sticky page header and the security
 * template's timeline bar. Neither takes a ref, so they are found by their test subjects.
 */
export const APP_HEADER_SELECTOR = `[data-test-subj="${APP_HEADER_TEST_SUBJECTS.root}"]`;
export const TIMELINE_BAR_SELECTOR = '[data-test-subj="timeline-bottom-bar-container"]';

const PINNED_BAR_SELECTORS = [APP_HEADER_SELECTOR, TIMELINE_BAR_SELECTOR];

/**
 * Height of the pinned bars, which Kibana's content height doesn't leave out. Found once the
 * element given the ref mounts, as the header renders only after the page loads, and again on
 * leaving full screen, which unmounts the header. Observed rather than measured once: the timeline
 * bar collapses in full screen and regrows only after it.
 */
export const usePinnedBarsHeight = (
  isFullScreen: boolean
): [number, (element: HTMLElement | null) => void] => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!element || isFullScreen) return;
    const bars = PINNED_BAR_SELECTORS.flatMap((selector) => document.querySelector(selector) ?? []);
    const observer = new ResizeObserver(() =>
      setHeight(sumBy(bars, (bar) => bar.getBoundingClientRect().height))
    );
    bars.forEach((bar) => observer.observe(bar));
    return () => observer.disconnect();
  }, [element, isFullScreen]);
  return [height, setElement];
};
