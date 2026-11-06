/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Whether the items of the flex row have wrapped, i.e. the last one starts below the first. */
export const hasWrapped = (row: Element | null): boolean => {
  const items = Array.from(row?.children ?? []).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );
  return items.length > 1 && items[items.length - 1].offsetTop - items[0].offsetTop > 2;
};

/**
 * How many of `total` optional items fit in a flex row without wrapping it. It starts from all of
 * them whenever the row's width or `resetKey` changes, then takes one away at a time until the row
 * no longer wraps, but never goes below `min`. `containerRef` goes on an element whose first child
 * is the flex row.
 *
 * It measures where the items are, so it needs no sizes of the items: the row wraps when its items
 * do not fit, whatever the language or the font.
 */
export const useFittingCount = ({
  total,
  min = 0,
  resetKey = '',
}: {
  total: number;
  min?: number;
  /** A value that changes when the items of the row change, e.g. what the filters select. */
  resetKey?: string;
}): { count: number; containerRef: RefObject<HTMLDivElement> } => {
  const containerRef = useRef<HTMLDivElement>(null);
  // `token` changes with every start over, so the row is checked again even when `count` did not.
  const [{ count, token }, setState] = useState({ count: total, token: 0 });
  const [generation, setGeneration] = useState(0);

  // A wider or narrower row starts the fitting over.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    let lastWidth = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth !== lastWidth) {
        lastWidth = container.clientWidth;
        setGeneration((current) => current + 1);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setState((current) => ({ count: total, token: current.token + 1 }));
  }, [total, resetKey, generation]);

  useLayoutEffect(() => {
    if (count > Math.max(min, 0) && hasWrapped(containerRef.current?.firstElementChild ?? null)) {
      setState((current) => ({ ...current, count: current.count - 1 }));
    }
  }, [count, token, min]);

  return { count: Math.min(Math.max(count, min), total), containerRef };
};
