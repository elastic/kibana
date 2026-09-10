/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active EA Facelift prototype version.
 *
 * Home UI lives in `./v1`–`./v7` as independent code snapshots. Flyout / table
 * mock bridges read this module so external hooks follow the selected version.
 * To ship a single final version later: keep that folder, delete the others,
 * drop the switcher, and point the thin root bridges at the survivor (or move
 * its files up one level and delete the bridges).
 *
 * Mock corpora are shared across v.2+ via re-exports from `./v2/data` (and
 * related mock modules) so entity fixtures stay single-sourced.
 *
 * The Kibana chrome header dropdown and the home page both read/write this
 * module; `subscribeActiveFaceliftVersion` keeps React state in sync.
 *
 * In v.6 and v.7, metric charts can also be swapped via a Metrics version
 * header control without changing the rest of the page. Each of those
 * prototypes owns its own metrics state: v.6 reads `./active_metrics_version`
 * (metrics v.1–v.7), v.7 reads `./v7/active_metrics_version` (metrics v.7 only,
 * the sole layout that prototype ships). Prototype v.5 keeps a fixed metrics
 * v.1 look with no control.
 */

import { useCallback, useEffect, useState } from 'react';

export type FaceliftVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7';

export const DEFAULT_FACELIFT_VERSION: FaceliftVersion = 'v7';

export const FACELIFT_VERSION_OPTIONS: Array<{ key: FaceliftVersion; label: string }> = [
  { key: 'v7', label: 'v.7' },
  { key: 'v6', label: 'v.6' },
  { key: 'v5', label: 'v.5' },
  { key: 'v4', label: 'v.4' },
  { key: 'v3', label: 'v.3' },
  { key: 'v2', label: 'v.2' },
  { key: 'v1', label: 'v.1' },
];

let activeFaceliftVersion: FaceliftVersion = DEFAULT_FACELIFT_VERSION;

type FaceliftVersionListener = (version: FaceliftVersion) => void;
const listeners = new Set<FaceliftVersionListener>();

export const getActiveFaceliftVersion = (): FaceliftVersion => activeFaceliftVersion;

export const setActiveFaceliftVersion = (version: FaceliftVersion): void => {
  if (version === activeFaceliftVersion) {
    return;
  }
  activeFaceliftVersion = version;
  listeners.forEach((listener) => listener(version));
};

export const subscribeActiveFaceliftVersion = (
  listener: FaceliftVersionListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** React binding for the chrome header + home page remount key. */
export const useActiveFaceliftVersion = (): [
  FaceliftVersion,
  (version: FaceliftVersion) => void
] => {
  const [version, setVersion] = useState(getActiveFaceliftVersion);

  useEffect(() => subscribeActiveFaceliftVersion(setVersion), []);

  const setFaceliftVersion = useCallback((next: FaceliftVersion) => {
    setActiveFaceliftVersion(next);
  }, []);

  return [version, setFaceliftVersion];
};

/** v.2+ share the AppHeader chrome and in-page search layout. */
export const isFaceliftAppHeaderVersion = (version: FaceliftVersion): boolean =>
  version === 'v2' ||
  version === 'v3' ||
  version === 'v4' ||
  version === 'v5' ||
  version === 'v6' ||
  version === 'v7';
