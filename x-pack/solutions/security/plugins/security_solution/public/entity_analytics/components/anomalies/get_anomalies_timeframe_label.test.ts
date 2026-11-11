/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityAnalyticsNewHomeScopeId } from '../../common/scope_time_ranges';
import { getAnomaliesTimeframeLabel } from './get_anomalies_timeframe_label';

describe('getAnomaliesTimeframeLabel', () => {
  it.each([
    ['24h', 'Last 24 hours'],
    ['7d', 'Last 7 days'],
    ['30d', 'Last 30 days'],
  ] as const)('labels the %s scope', (timeRange, label) => {
    expect(getAnomaliesTimeframeLabel(getEntityAnalyticsNewHomeScopeId(timeRange))).toBe(label);
  });

  it('defaults to the last 30 days when the scope pins no range', () => {
    expect(getAnomaliesTimeframeLabel('alerts-page')).toBe('Last 30 days');
    expect(getAnomaliesTimeframeLabel(undefined)).toBe('Last 30 days');
  });
});
