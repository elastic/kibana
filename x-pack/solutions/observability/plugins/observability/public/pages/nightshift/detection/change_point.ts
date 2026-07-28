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

export function getDetectionOccurrenceTimeRange(
  timestamp: string | number
): DetectionOccurrenceTimeRange | undefined {
  const detectionTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!Number.isFinite(detectionTime)) {
    return undefined;
  }

  return {
    from: detectionTime - DETECTION_OCCURRENCE_LOOKBACK_MS,
    to: detectionTime + DETECTION_OCCURRENCE_FOLLOWUP_MS,
  };
}

export function filterOccurrencesForDetection(
  occurrences: readonly OccurrencePoint[],
  timestamp: string
): OccurrencePoint[] {
  const range = getDetectionOccurrenceTimeRange(timestamp);
  if (!range) {
    return [];
  }

  return occurrences.filter(({ x }) => x >= range.from && x <= range.to);
}
