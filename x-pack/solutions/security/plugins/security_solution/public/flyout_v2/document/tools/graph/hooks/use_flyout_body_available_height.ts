/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

const FLYOUT_BODY_SELECTOR = '.euiFlyoutBody__overflow';
const PANEL_SELECTOR = '.euiPanel';

/**
 * Measures the available vertical space inside the surrounding `EuiFlyoutBody`
 * for the element pointed at by `ref`, in pixels.
 *
 * The returned height fills the area from the top of `ref.current` down to the
 * bottom of `.euiFlyoutBody__overflow`, minus the bottom padding of the nearest
 * enclosing `.euiPanel` (so the panel's `paddingMedium` doesn't push content
 * past the flyout body and trigger a redundant scrollbar).
 *
 * Re-measures on viewport resize via `ResizeObserver`. Returns `0` until the
 * element is mounted inside an `EuiFlyoutBody`.
 */
export const useFlyoutBodyAvailableHeight = (ref: RefObject<HTMLElement | null>): number => {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      if (!el.isConnected) return;
      const flyoutBody = el.closest(FLYOUT_BODY_SELECTOR);
      if (!flyoutBody) return;
      const panel = el.closest(PANEL_SELECTOR);
      const paddingBottom = panel ? parseFloat(getComputedStyle(panel).paddingBottom) || 0 : 0;
      const flyoutBottom = flyoutBody.getBoundingClientRect().bottom;
      const wrapperTop = el.getBoundingClientRect().top;
      const next = Math.max(0, flyoutBottom - wrapperTop - paddingBottom);
      setHeight((prev) => (prev === next ? prev : next));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [ref]);

  return height;
};
