/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChangePointType } from '@kbn/significant-events-schema';

const CHANGE_POINT_LABELS: Record<ChangePointType, string> = {
  spike: i18n.translate('xpack.nightshift.flyout.changePoint.spikeLabel', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.nightshift.flyout.changePoint.dipLabel', {
    defaultMessage: 'Dip',
  }),
  trend_change: i18n.translate('xpack.nightshift.flyout.changePoint.trendChangeLabel', {
    defaultMessage: 'Trend change',
  }),
  step_change: i18n.translate('xpack.nightshift.flyout.changePoint.stepChangeLabel', {
    defaultMessage: 'Step change',
  }),
  distribution_change: i18n.translate(
    'xpack.nightshift.flyout.changePoint.distributionChangeLabel',
    { defaultMessage: 'Distribution change' }
  ),
  non_stationary: i18n.translate('xpack.nightshift.flyout.changePoint.nonStationaryLabel', {
    defaultMessage: 'Non-stationary',
  }),
  stationary: i18n.translate('xpack.nightshift.flyout.changePoint.stationaryLabel', {
    defaultMessage: 'Stationary',
  }),
};

const UNKNOWN_CHANGE_POINT_LABEL = i18n.translate(
  'xpack.nightshift.flyout.changePoint.unknownLabel',
  { defaultMessage: 'Unknown' }
);

export function getChangePointLabel(type?: ChangePointType): string {
  if (!type) {
    return UNKNOWN_CHANGE_POINT_LABEL;
  }
  return CHANGE_POINT_LABELS[type] ?? UNKNOWN_CHANGE_POINT_LABEL;
}

export interface OccurrencePoint {
  x: number;
  y: number;
}

export interface DetectionOccurrenceTimeRange {
  from: number;
  to: number;
}

export const DETECTION_OCCURRENCE_LOOKBACK_MS = 60 * 60 * 1000;
export const DETECTION_OCCURRENCE_FOLLOWUP_MS = 15 * 60 * 1000;
export const DETECTION_OCCURRENCE_BUCKET_SIZE = '5m';
/** Matches server METRIC_SERIES_MAX_WRITE_DELAY so live charts omit unreadable trailing buckets. */
export const DETECTION_OCCURRENCE_WRITE_HORIZON_MS = 7 * 60 * 1000;

const OCCURRENCE_BUCKET_SIZE_PATTERN = /^(\d+)([smhd])$/;
const OCCURRENCE_BUCKET_UNIT_LABELS = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
} as const;
const OCCURRENCE_BUCKET_UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

export function parseOccurrenceBucketSize(bucketSize: string): {
  value: number;
  unit: keyof typeof OCCURRENCE_BUCKET_UNIT_LABELS;
  unitLabel: (typeof OCCURRENCE_BUCKET_UNIT_LABELS)[keyof typeof OCCURRENCE_BUCKET_UNIT_LABELS];
} {
  const match = bucketSize.match(OCCURRENCE_BUCKET_SIZE_PATTERN);
  if (!match) {
    return { value: 5, unit: 'm', unitLabel: 'minutes' };
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2] as keyof typeof OCCURRENCE_BUCKET_UNIT_LABELS;
  if (value < 1 || !(unit in OCCURRENCE_BUCKET_UNIT_LABELS)) {
    return { value: 5, unit: 'm', unitLabel: 'minutes' };
  }
  return { value, unit, unitLabel: OCCURRENCE_BUCKET_UNIT_LABELS[unit] };
}

export function getOccurrenceBucketIntervalMs(
  bucketSize: string = DETECTION_OCCURRENCE_BUCKET_SIZE
): number {
  const { value, unit } = parseOccurrenceBucketSize(bucketSize);
  return value * OCCURRENCE_BUCKET_UNIT_MS[unit];
}

export function getDetectionOccurrenceTimeRange(
  timestamp: string | number
): DetectionOccurrenceTimeRange | undefined {
  const detectionTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!Number.isFinite(detectionTime)) {
    return undefined;
  }

  const from = detectionTime - DETECTION_OCCURRENCE_LOOKBACK_MS;
  const requestedTo = detectionTime + DETECTION_OCCURRENCE_FOLLOWUP_MS;
  const writeHorizon = Date.now() - DETECTION_OCCURRENCE_WRITE_HORIZON_MS;
  const to = Math.min(requestedTo, writeHorizon);

  if (to < from) {
    return undefined;
  }

  return { from, to };
}

export function filterOccurrencesForDetection(
  occurrences: readonly OccurrencePoint[],
  timestamp: string | number
): OccurrencePoint[] {
  const range = getDetectionOccurrenceTimeRange(timestamp);
  if (!range) {
    return [];
  }

  return occurrences.filter(({ x }) => x >= range.from && x <= range.to);
}
