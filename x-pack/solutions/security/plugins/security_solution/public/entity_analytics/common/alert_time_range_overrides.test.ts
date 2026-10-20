/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_OPTIONS } from '../components/home/entities_grid/common';
import { ENTITY_ANALYTICS_TABLE_ID } from '../components/home/constants';
import {
  SCOPE_ALERT_TIME_RANGE_OVERRIDES,
  getEntityAnalyticsNewHomeScopeId,
  getScopeFlyoutTimeRange,
} from './alert_time_range_overrides';

describe('getEntityAnalyticsNewHomeScopeId', () => {
  it('gives each time range its own scope', () => {
    const scopeIds = TIME_RANGE_OPTIONS.map(getEntityAnalyticsNewHomeScopeId);

    expect(new Set(scopeIds).size).toBe(TIME_RANGE_OPTIONS.length);
  });

  it.each(TIME_RANGE_OPTIONS)('queries alerts over the last %s in its scope', (timeRange) => {
    expect(SCOPE_ALERT_TIME_RANGE_OVERRIDES[getEntityAnalyticsNewHomeScopeId(timeRange)]).toEqual({
      from: `now-${timeRange}`,
      to: 'now',
    });
  });
});

describe('getScopeFlyoutTimeRange', () => {
  it.each(TIME_RANGE_OPTIONS)('pins the whole flyout to the last %s for its scope', (timeRange) => {
    expect(getScopeFlyoutTimeRange(getEntityAnalyticsNewHomeScopeId(timeRange))).toEqual({
      from: `now-${timeRange}`,
      to: 'now',
    });
  });

  it('is undefined for scopes that only pin alerts, unknown scopes and no scope', () => {
    expect(getScopeFlyoutTimeRange(ENTITY_ANALYTICS_TABLE_ID)).toBeUndefined();
    expect(getScopeFlyoutTimeRange('alerts-page')).toBeUndefined();
    expect(getScopeFlyoutTimeRange(undefined)).toBeUndefined();
  });
});
