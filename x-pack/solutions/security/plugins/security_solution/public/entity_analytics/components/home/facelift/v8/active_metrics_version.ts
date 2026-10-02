/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active metrics-charts version within prototype v.8.
 *
 * Deliberately separate from the facelift-root `../active_metrics_version`
 * (prototype v.6, metrics v.1–v.7) and from `../v7/active_metrics_version`
 * (prototype v.7, metrics v.7–v.8): each prototype keeps its own isolated
 * metrics state, so switching prototypes cannot leave v.8 pointing at a
 * metrics folder it does not contain.
 *
 * Metrics version picks the card layout (`v8/metrics/vN/`). Simplified metrics
 * is a visual overlay on that version: it hides background sparklines and
 * period deltas without changing which version is selected.
 */

import { useCallback, useEffect, useState } from 'react';

export type MetricsVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6';

export const DEFAULT_METRICS_VERSION: MetricsVersion = 'v6';

export const METRICS_VERSION_OPTIONS: Array<{ key: MetricsVersion; label: string }> = [
  { key: 'v1', label: 'v.1' },
  { key: 'v2', label: 'v.2' },
  { key: 'v3', label: 'v.3' },
  { key: 'v4', label: 'v.4' },
  { key: 'v5', label: 'v.5' },
  { key: 'v6', label: 'v.6' },
];

export const getMetricsVersionOptions = (): Array<{ key: MetricsVersion; label: string }> =>
  METRICS_VERSION_OPTIONS;

let simplifiedMetrics = false;
let activeMetricsVersion: MetricsVersion = DEFAULT_METRICS_VERSION;

type SimplifiedListener = (simplified: boolean) => void;
const simplifiedListeners = new Set<SimplifiedListener>();

type MetricsVersionListener = (version: MetricsVersion) => void;
const versionListeners = new Set<MetricsVersionListener>();

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

export const getActiveMetricsVersion = (): MetricsVersion => activeMetricsVersion;

export const setActiveMetricsVersion = (version: MetricsVersion): void => {
  if (version === activeMetricsVersion) {
    return;
  }
  activeMetricsVersion = version;
  versionListeners.forEach((listener) => listener(version));
};

export const subscribeActiveMetricsVersion = (listener: MetricsVersionListener): (() => void) => {
  versionListeners.add(listener);
  return () => {
    versionListeners.delete(listener);
  };
};

/** React binding for the chrome header + v.8 metrics remount. */
export const useActiveMetricsVersion = (): [MetricsVersion, (version: MetricsVersion) => void] => {
  const [version, setVersion] = useState(getActiveMetricsVersion);

  useEffect(() => subscribeActiveMetricsVersion(setVersion), []);

  const setMetricsVersion = useCallback((next: MetricsVersion) => {
    setActiveMetricsVersion(next);
  }, []);

  return [version, setMetricsVersion];
};
