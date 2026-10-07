/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

// Measure the space below a panel so its own content can scroll within the viewport.
export const useViewportSpace = <Element extends HTMLElement | SVGSVGElement>(
  bottomInset = 16
): { ref: RefObject<Element>; height: number | undefined; width: number | undefined } => {
  const ref = useRef<Element>(null);
  const [height, setHeight] = useState<number>();
  const [width, setWidth] = useState<number>();
  const measure = useCallback((): void => {
    if (!ref.current) return;
    setWidth(Math.floor(ref.current.getBoundingClientRect().width));
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    setHeight(
      Math.max(0, Math.floor(bottom - ref.current.getBoundingClientRect().top - bottomInset))
    );
  }, [bottomInset]);
  useLayoutEffect(measure);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [measure]);
  return { ref, height, width };
};
