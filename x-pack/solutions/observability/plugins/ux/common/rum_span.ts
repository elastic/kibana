/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumSessionTrafficPoint } from './rum_apps';

export interface RumAppsSpanResponse {
  points: RumSessionTrafficPoint[];
  /** True when sessions exist outside the selected range. */
  hasData: boolean;
  domainFrom: number | null;
  domainTo: number | null;
  selectionFrom: number;
  selectionTo: number;
}

export const emptyRumAppsSpan = (
  selectionFrom: number,
  selectionTo: number
): RumAppsSpanResponse => ({
  points: [],
  hasData: false,
  domainFrom: null,
  domainTo: null,
  selectionFrom,
  selectionTo,
});

/** Sessions whose bucket start sits outside the selected window. */
export const rumSpanHasOutsideData = (
  points: RumSessionTrafficPoint[],
  rangeFromMs: number,
  rangeToMs: number
): boolean =>
  points.some(
    (point) => point.sessions > 0 && (point.timestamp < rangeFromMs || point.timestamp > rangeToMs)
  );

/** Chart domain covering both recorded traffic and the empty selection. */
export const rumSpanDomain = (
  points: RumSessionTrafficPoint[],
  rangeFromMs: number,
  rangeToMs: number
): { fromMs: number; toMs: number } | null => {
  if (points.length === 0) {
    return null;
  }
  let dataMin = points[0].timestamp;
  let dataMax = points[0].timestamp;
  for (const point of points) {
    if (point.timestamp < dataMin) {
      dataMin = point.timestamp;
    }
    if (point.timestamp > dataMax) {
      dataMax = point.timestamp;
    }
  }
  const fromMs = Math.min(dataMin, rangeFromMs);
  const toMs = Math.max(dataMax, rangeToMs);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
    return null;
  }
  return { fromMs, toMs };
};

export const rumAppsSpanFromPoints = (
  points: RumSessionTrafficPoint[],
  rangeFromMs: number,
  rangeToMs: number
): RumAppsSpanResponse => {
  const domain = rumSpanDomain(points, rangeFromMs, rangeToMs);
  return {
    points,
    hasData: rumSpanHasOutsideData(points, rangeFromMs, rangeToMs),
    domainFrom: domain?.fromMs ?? null,
    domainTo: domain?.toMs ?? null,
    selectionFrom: rangeFromMs,
    selectionTo: rangeToMs,
  };
};
