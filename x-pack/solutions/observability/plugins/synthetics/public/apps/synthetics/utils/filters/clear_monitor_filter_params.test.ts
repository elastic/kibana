/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSupportedUrlParams } from '../url_params';
import {
  getClearedMonitorFilterParams,
  hasActiveMonitorFilters,
} from './clear_monitor_filter_params';

describe('clear monitor filter params', () => {
  it('is inactive for default url params', () => {
    expect(hasActiveMonitorFilters(getSupportedUrlParams({}))).toBe(false);
  });

  it('is active when filter-bar fields are set', () => {
    expect(
      hasActiveMonitorFilters(
        getSupportedUrlParams({
          tags: JSON.stringify(['prod']),
          locations: JSON.stringify(['us-east']),
        })
      )
    ).toBe(true);
  });

  it('is active for search query and status filter', () => {
    expect(hasActiveMonitorFilters(getSupportedUrlParams({ query: 'checkout' }))).toBe(true);
    expect(hasActiveMonitorFilters(getSupportedUrlParams({ statusFilter: 'down' }))).toBe(true);
  });

  it('ignores date range, view, and pagination-only', () => {
    expect(
      hasActiveMonitorFilters(
        getSupportedUrlParams({
          dateRangeStart: 'now-1h',
          dateRangeEnd: 'now',
          view: 'compactView',
          pagination: 'token',
        })
      )
    ).toBe(false);
  });

  it('clears filter keys and leaves unrelated keys unset', () => {
    const cleared = getClearedMonitorFilterParams();

    expect(cleared).toEqual(
      expect.objectContaining({
        query: undefined,
        statusFilter: undefined,
        tags: undefined,
        locations: undefined,
        monitorTypes: undefined,
        projects: undefined,
        schedules: undefined,
        remoteNames: undefined,
        useLogicalAndFor: undefined,
        configIds: undefined,
        pagination: undefined,
      })
    );
    expect(cleared).not.toHaveProperty('dateRangeStart');
    expect(cleared).not.toHaveProperty('view');
  });
});
