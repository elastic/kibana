/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active preset window for prototype v.7.
 *
 * v.7 swaps the KQL bar's super date picker for a three-button group (24h / 7d
 * / 30d), and every overview metric is counted inside the selected window.
 *
 * The range lives in a module store rather than React state because the mock
 * data helpers in `./data` need it synchronously: `getSignalCards` and the card
 * variants of `filterIdentities` / `filterRawRecords` all narrow to the window,
 * and they are called from several places that never see a range prop. Reading
 * one source keeps the card values and the table rows they filter to in
 * agreement. Components subscribe through {@link useActiveTimeRange} so they
 * re-render (and re-run their memos) when the preset changes.
 */

import { useCallback, useEffect, useState } from 'react';

import type { FaceliftTimeRangeId } from './time_range';
import { DEFAULT_FACELIFT_TIME_RANGE } from './time_range';

let activeTimeRange: FaceliftTimeRangeId = DEFAULT_FACELIFT_TIME_RANGE;

type TimeRangeListener = (range: FaceliftTimeRangeId) => void;
const listeners = new Set<TimeRangeListener>();

export const getActiveTimeRange = (): FaceliftTimeRangeId => activeTimeRange;

export const setActiveTimeRange = (range: FaceliftTimeRangeId): void => {
  if (range === activeTimeRange) {
    return;
  }
  activeTimeRange = range;
  listeners.forEach((listener) => listener(range));
};

export const subscribeActiveTimeRange = (listener: TimeRangeListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** React binding for the KQL-bar button group and every window-aware metric. */
export const useActiveTimeRange = (): [
  FaceliftTimeRangeId,
  (range: FaceliftTimeRangeId) => void
] => {
  const [range, setRange] = useState(getActiveTimeRange);

  useEffect(() => subscribeActiveTimeRange(setRange), []);

  const setTimeRange = useCallback((next: FaceliftTimeRangeId) => {
    setActiveTimeRange(next);
  }, []);

  return [range, setTimeRange];
};
