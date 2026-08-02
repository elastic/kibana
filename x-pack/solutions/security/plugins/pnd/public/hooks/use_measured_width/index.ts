/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface UseMeasuredWidthResult<T extends HTMLElement> {
  /** Attach to the element whose width matters. */
  ref: RefObject<T>;
  /** `0` until the element has been laid out — never a guess. */
  width: number;
}

/**
 * The rendered width of one element, tracked with a `ResizeObserver`.
 *
 * `@elastic/charts` needs an explicit pixel size rather than a percentage, so a chart in a fluid
 * column has to be told how wide its column turned out to be. `0` before the first measurement is
 * the point: a caller renders nothing until it has a real width, instead of drawing a chart at a
 * guessed size and reflowing it.
 *
 * `useLayoutEffect` rather than `useEffect` so the measurement happens before the browser paints,
 * which is what keeps that first render from flashing.
 */
export const useMeasuredWidth = <T extends HTMLElement>(): UseMeasuredWidthResult<T> => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;

    if (node == null) {
      return;
    }

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
