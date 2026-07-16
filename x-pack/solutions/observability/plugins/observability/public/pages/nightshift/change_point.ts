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

export function getChangePointLabel(type?: ChangePointType): string {
  if (!type) {
    return i18n.translate('xpack.observability.nightshift.flyout.detectionFallbackLabel', {
      defaultMessage: 'Detection',
    });
  }
  return CHANGE_POINT_LABELS[type];
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

  for (let i = 0; i < points; i++) {
    let y: number;
    switch (changePointType) {
      case 'spike':
        y = i >= points - Math.ceil(points / 5) ? 0.7 + rand() : 0.2 + rand();
        break;
      case 'dip':
        y = i >= points - Math.ceil(points / 5) ? 0.1 + rand() : 0.6 + rand();
        break;
      case 'trend_change':
        y = i < points / 2 ? 0.4 + rand() : 0.4 + ((i - points / 2) * 0.8) / points + rand();
        break;
      case 'step_change':
        y = i < points / 2 ? 0.25 + rand() : 0.65 + rand();
        break;
      default:
        y = 0.3 + rand();
    }
    data.push({ x: i, y });
  }
  return data;
}
