/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active metrics-charts version within prototype v.7.
 *
 * Deliberately separate from the facelift-root `../active_metrics_version`,
 * which still serves prototype v.6 with its v.1–v.7 history: each prototype
 * keeps its own isolated metrics state, so switching prototypes cannot leave
 * v.7 pointing at a metrics folder it does not contain.
 *
 * Each metrics version is a self-contained folder under `v7/metrics/vN/`
 * (panel, signal cards, Entities-by charts, layout, summary data). Versions do
 * not import from each other. To hand off a single metrics version: keep that
 * folder, delete the others, and trim this module + the switch in
 * `v7/metric_charts_panel.tsx`.
 */

import { useCallback, useEffect, useState } from 'react';

export type MetricsVersion = 'v7' | 'v8';

export const DEFAULT_METRICS_VERSION: MetricsVersion = 'v8';

export const METRICS_VERSION_OPTIONS: Array<{ key: MetricsVersion; label: string }> = [
  { key: 'v8', label: 'v.8' },
  { key: 'v7', label: 'v.7' },
];

let activeMetricsVersion: MetricsVersion = DEFAULT_METRICS_VERSION;

type MetricsVersionListener = (version: MetricsVersion) => void;
const listeners = new Set<MetricsVersionListener>();

export const getActiveMetricsVersion = (): MetricsVersion => activeMetricsVersion;

export const setActiveMetricsVersion = (version: MetricsVersion): void => {
  if (version === activeMetricsVersion) {
    return;
  }
  activeMetricsVersion = version;
  listeners.forEach((listener) => listener(version));
};

export const subscribeActiveMetricsVersion = (listener: MetricsVersionListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** React binding for the chrome header + v.7 metrics remount. */
export const useActiveMetricsVersion = (): [MetricsVersion, (version: MetricsVersion) => void] => {
  const [version, setVersion] = useState(getActiveMetricsVersion);

  useEffect(() => subscribeActiveMetricsVersion(setVersion), []);

  const setMetricsVersion = useCallback((next: MetricsVersion) => {
    setActiveMetricsVersion(next);
  }, []);

  return [version, setMetricsVersion];
};
