/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScopeFlyoutLookback } from '../../common/scope_time_ranges';
import {
  ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME,
  ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME_DAYS,
  ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME_HOURS,
} from './translations';

/** Label for the window the anomalies were queried over; the server's 30-day default when `scopeId` pins none. */
export const getAnomaliesTimeframeLabel = (scopeId?: string): string => {
  const lookback = getScopeFlyoutLookback(scopeId);
  if (!lookback) return ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME;
  const { amount, unit } = lookback;
  return unit === 'hours'
    ? ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME_HOURS(amount)
    : ENTITY_ANOMALIES_OVERVIEW_TIMEFRAME_DAYS(amount);
};
