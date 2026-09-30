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
 * The Simplified metrics chrome switch picks a track (`full` vs `simplified`).
 * Each track has its own Metrics version list and selected version so the two
 * looks can iterate independently. Implementations live under
 * `v8/metrics/vN/` (full) and `v8/metrics/simplified/vN/` (simplified).
 */

import { useCallback, useEffect, useState } from 'react';

export type MetricsTrack = 'full' | 'simplified';
export type MetricsVersion = 'v1';

export const DEFAULT_METRICS_VERSION: MetricsVersion = 'v1';

export const FULL_METRICS_VERSION_OPTIONS: Array<{ key: MetricsVersion; label: string }> = [
  { key: 'v1', label: 'v.1' },
];

export const SIMPLIFIED_METRICS_VERSION_OPTIONS: Array<{
  key: MetricsVersion;
  label: string;
}> = [{ key: 'v1', label: 'v.1' }];

export const getMetricsVersionOptions = (
  simplified: boolean
): Array<{ key: MetricsVersion; label: string }> =>
  simplified ? SIMPLIFIED_METRICS_VERSION_OPTIONS : FULL_METRICS_VERSION_OPTIONS;

let simplifiedMetrics = false;
const versionByTrack: Record<MetricsTrack, MetricsVersion> = {
  full: DEFAULT_METRICS_VERSION,
  simplified: DEFAULT_METRICS_VERSION,
};

const getTrack = (): MetricsTrack => (simplifiedMetrics ? 'simplified' : 'full');

type SimplifiedListener = (simplified: boolean) => void;
const simplifiedListeners = new Set<SimplifiedListener>();

type MetricsVersionListener = (version: MetricsVersion) => void;
const versionListeners = new Set<MetricsVersionListener>();

const notifyVersionListeners = (): void => {
  const version = versionByTrack[getTrack()];
  versionListeners.forEach((listener) => listener(version));
};

export const getSimplifiedMetrics = (): boolean => simplifiedMetrics;

export const setSimplifiedMetrics = (next: boolean): void => {
  if (next === simplifiedMetrics) {
    return;
  }
  simplifiedMetrics = next;
  simplifiedListeners.forEach((listener) => listener(next));
  notifyVersionListeners();
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

export const getActiveMetricsVersion = (): MetricsVersion => versionByTrack[getTrack()];

export const setActiveMetricsVersion = (version: MetricsVersion): void => {
  const track = getTrack();
  if (version === versionByTrack[track]) {
    return;
  }
  versionByTrack[track] = version;
  notifyVersionListeners();
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
