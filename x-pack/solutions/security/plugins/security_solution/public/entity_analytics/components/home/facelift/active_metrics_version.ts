/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active metrics-charts version within prototype v.6.
 *
 * Prototype version (v.1–v.6) swaps the whole EA home page. Metrics version
 * only swaps the overview metric charts inside v.6 — the rest of the page
 * stays on the selected prototype. Prototype v.5 keeps a fixed metrics v.1 look
 * (no Metrics version header control).
 *
 * Each metrics version is a self-contained folder under `v6/metrics/vN/`
 * (panel, signal cards, Entities-by charts, layout, summary data). Versions
 * do not import from each other. To hand off a single metrics version: keep
 * that folder, delete the others, and trim this module + the switch in
 * `v6/metric_charts_panel.tsx`.
 *
 * The chrome header "Metrics version" dropdown (v.6 only) and the v.6
 * MetricChartsPanel both read/write this module.
 */

import { useCallback, useEffect, useState } from 'react';

export type MetricsVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7';

export const DEFAULT_METRICS_VERSION: MetricsVersion = 'v7';

export const METRICS_VERSION_OPTIONS: Array<{ key: MetricsVersion; label: string }> = [
  { key: 'v7', label: 'v.7' },
  { key: 'v6', label: 'v.6' },
  { key: 'v5', label: 'v.5' },
  { key: 'v4', label: 'v.4' },
  { key: 'v3', label: 'v.3' },
  { key: 'v2', label: 'v.2' },
  { key: 'v1', label: 'v.1' },
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

export const subscribeActiveMetricsVersion = (
  listener: MetricsVersionListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** React binding for the chrome header + v.6 metrics remount. */
export const useActiveMetricsVersion = (): [
  MetricsVersion,
  (version: MetricsVersion) => void
] => {
  const [version, setVersion] = useState(getActiveMetricsVersion);

  useEffect(() => subscribeActiveMetricsVersion(setVersion), []);

  const setMetricsVersion = useCallback((next: MetricsVersion) => {
    setActiveMetricsVersion(next);
  }, []);

  return [version, setMetricsVersion];
};
