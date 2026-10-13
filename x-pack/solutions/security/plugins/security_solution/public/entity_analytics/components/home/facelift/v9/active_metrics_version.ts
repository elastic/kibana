/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Metrics state for prototype v.9.
 *
 * v.9 ships a single metrics layout (`./metrics/v6`), so there is no metrics
 * version to pick. Simplified metrics is a visual overlay on that layout: it
 * hides background sparklines and period deltas. The state is separate from
 * `../v8/active_metrics_version` so toggling it in one prototype does not
 * change the other.
 */

import { useCallback, useEffect, useState } from 'react';

let simplifiedMetrics = false;

type SimplifiedListener = (simplified: boolean) => void;
const simplifiedListeners = new Set<SimplifiedListener>();

export const getSimplifiedMetrics = (): boolean => simplifiedMetrics;

export const setSimplifiedMetrics = (next: boolean): void => {
  if (next === simplifiedMetrics) {
    return;
  }
  simplifiedMetrics = next;
  simplifiedListeners.forEach((listener) => listener(next));
};

export const subscribeSimplifiedMetrics = (listener: SimplifiedListener): (() => void) => {
  simplifiedListeners.add(listener);
  return () => {
    simplifiedListeners.delete(listener);
  };
};

export const useSimplifiedMetrics = (): [boolean, (simplified: boolean) => void] => {
  const [simplified, setSimplified] = useState(getSimplifiedMetrics);

  useEffect(() => subscribeSimplifiedMetrics(setSimplified), []);

  const setSimplifiedValue = useCallback((next: boolean) => {
    setSimplifiedMetrics(next);
  }, []);

  return [simplified, setSimplifiedValue];
};
