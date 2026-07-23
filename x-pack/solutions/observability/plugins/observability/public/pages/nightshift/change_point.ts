/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChangePointType } from '@kbn/significant-events-schema';

const CHANGE_POINT_LABELS: Record<ChangePointType, string> = {
  spike: i18n.translate('xpack.observability.nightshift.flyout.changePoint.spikeLabel', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.observability.nightshift.flyout.changePoint.dipLabel', {
    defaultMessage: 'Dip',
  }),
  trend_change: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.trendChangeLabel',
    { defaultMessage: 'Trend change' }
  ),
  step_change: i18n.translate('xpack.observability.nightshift.flyout.changePoint.stepChangeLabel', {
    defaultMessage: 'Step change',
  }),
  distribution_change: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.distributionChangeLabel',
    { defaultMessage: 'Distribution change' }
  ),
  non_stationary: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.nonStationaryLabel',
    { defaultMessage: 'Non-stationary' }
  ),
  stationary: i18n.translate('xpack.observability.nightshift.flyout.changePoint.stationaryLabel', {
    defaultMessage: 'Stationary',
  }),
};

const UNKNOWN_CHANGE_POINT_LABEL = i18n.translate(
  'xpack.observability.nightshift.flyout.changePoint.unknownLabel',
  { defaultMessage: 'Unknown' }
);

export function getChangePointLabel(type?: ChangePointType): string {
  if (!type) {
    return UNKNOWN_CHANGE_POINT_LABEL;
  }
  return CHANGE_POINT_LABELS[type] ?? UNKNOWN_CHANGE_POINT_LABEL;
}

/**
 * Canonical framing for illustrative time windows (matches the flyout trend).
 * Sparklines may use fewer points for layout, but tooltips share this clock so
 * list + flyout timestamps stay aligned.
 */
export const ILLUSTRATIVE_SERIES_POINTS = 28;
export const ILLUSTRATIVE_POINT_INTERVAL_MS = 60_000;

/**
 * Index in an illustrative series where the change-point shape flips. Used to
 * place the detection annotation; with real occurrence data this becomes the
 * API's change-point bucket (#277558).
 */
export function getChangePointIndex(
  changePointType: ChangePointType | undefined,
  points: number
): number {
  switch (changePointType) {
    case 'spike':
    case 'dip':
      return points - Math.ceil(points / 5);
    case 'trend_change':
    case 'step_change':
      return Math.floor(points / 2);
    default:
      // Flat / unknown shapes: mark the end of the window (detection time).
      return Math.max(points - 1, 0);
  }
}

/**
 * Timestamp of the illustrative change knee when the series window ends at
 * `endTime` (detection time). Shared by list + flyout tooltips.
 */
export function getChangePointTimestamp(
  endTime: string | number,
  changePointType: ChangePointType | undefined,
  points: number = ILLUSTRATIVE_SERIES_POINTS,
  intervalMs: number = ILLUSTRATIVE_POINT_INTERVAL_MS
): number {
  const end = typeof endTime === 'number' ? endTime : new Date(endTime).getTime();
  const changeIndex = getChangePointIndex(changePointType, points);
  return end - (points - 1 - changeIndex) * intervalMs;
}

/**
 * Illustrative series shaped by the change-point type. Real occurrence
 * timeseries need the `_query_occurrences` API (tracked in #277558).
 */
export function generateChangePointSeries(
  changePointType: ChangePointType | undefined,
  points: number
): Array<{ x: number; y: number }> {
  const data: Array<{ x: number; y: number }> = [];
  const rand = () => Math.random() * 0.3;
  const changeAt = getChangePointIndex(changePointType, points);

  for (let i = 0; i < points; i++) {
    let y: number;
    switch (changePointType) {
      case 'spike':
        y = i >= changeAt ? 0.7 + rand() : 0.2 + rand();
        break;
      case 'dip':
        y = i >= changeAt ? 0.1 + rand() : 0.6 + rand();
        break;
      case 'trend_change':
        y = i < changeAt ? 0.4 + rand() : 0.4 + ((i - changeAt) * 0.8) / points + rand();
        break;
      case 'step_change':
        y = i < changeAt ? 0.25 + rand() : 0.65 + rand();
        break;
      case 'distribution_change':
        y = i < changeAt ? 0.25 + rand() * 0.35 : 0.35 + rand() * 0.55;
        break;
      case 'non_stationary':
        y = 0.2 + (i / Math.max(points - 1, 1)) * 0.45 + rand() * 0.2;
        break;
      case 'stationary':
        y = 0.45 + rand() * 0.08;
        break;
      default:
        y = 0.3 + rand();
    }
    data.push({ x: i, y });
  }
  return data;
}
