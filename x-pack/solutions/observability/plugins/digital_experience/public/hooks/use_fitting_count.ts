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
 * no longer wraps, but never goes below `min`. If the row still wraps at `min`, something other
 * than the items makes it (e.g. a control that has no room beside them), so taking items away does
 * not help and all `total` come back. `containerRef` goes on an element whose first child is the
 * flex row. Use the hook in a component of its own: every step renders the component that has it.
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
  const [{ count, token, hasGivenUp }, setState] = useState({
    count: total,
    token: 0,
    hasGivenUp: false,
  });
  const [generation, setGeneration] = useState(0);
  const floor = Math.max(min, 0);

  // A wider or narrower row, or last item, starts the fitting over. The last item is watched too as
  // its width is not the items' to change: a longer label of the date picker takes room from them,
  // and a shorter one gives it back. The other items are not, as the fitting changes their width.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    const lastItem = container.firstElementChild?.lastElementChild;
    const widths = () => `${container.clientWidth}|${lastItem?.clientWidth ?? 0}`;
    let lastWidths = widths();
    const observer = new ResizeObserver(() => {
      const current = widths();
      if (current !== lastWidths) {
        lastWidths = current;
        setGeneration((previous) => previous + 1);
      }
    });
    observer.observe(container);
    if (lastItem) {
      observer.observe(lastItem);
    }
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setState((current) => ({ count: total, token: current.token + 1, hasGivenUp: false }));
  }, [total, resetKey, generation]);

  useLayoutEffect(() => {
    if (hasGivenUp || !hasWrapped(containerRef.current?.firstElementChild ?? null)) {
      return;
    }
    setState((current) =>
      current.count > floor
        ? { ...current, count: current.count - 1 }
        : { ...current, count: total, hasGivenUp: true }
    );
  }, [count, token, hasGivenUp, floor, total]);

  return { count: hasGivenUp ? total : Math.min(Math.max(count, min), total), containerRef };
};
