/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorSummaryStatsRoute } from './get_monitor_summary_stats';
import { HEARTBEAT_UNMAPPED_LOCATION_LABEL } from '../../../common/runtime_types/heartbeat_monitor';

const aggregations = {
  total: { value: 100 },
  up: { doc_count: 96 },
  down: { doc_count: 4 },
  median_duration: { values: { '50.0': 250000 } },
};

const runHandler = async (locationLabel: string) => {
  const search = jest.fn().mockResolvedValue({ body: { aggregations } });
  const route = getMonitorSummaryStatsRoute();
  const result = await route.handler({
    // @ts-expect-error partial implementation for testing
    request: { query: { monitorId: 'my-monitor', locationLabel, from: 'now-30d', to: 'now' } },
    // @ts-expect-error partial implementation for testing
    syntheticsEsClient: { search, heartbeatIndices: 'synthetics-*' },
  });
  return { result, filters: search.mock.calls[0][0].query.bool.filter };
};

describe('getMonitorSummaryStatsRoute', () => {
  afterEach(() => jest.clearAllMocks());

  it('filters by observer.geo.name for a real location', async () => {
    const { filters, result } = await runHandler('North America - US East');

    expect(filters).toContainEqual({
      term: { 'observer.geo.name': 'North America - US East' },
    });
    // Sanity: aggregations are turned into the summary payload.
    expect(result).toEqual({
      availability: 96,
      medianDuration: 250,
      errorCount: 4,
      totalRuns: 100,
    });
  });

  // Regression: autodiscovery/heartbeat pings carry no observer.geo.name and are
  // surfaced under the "Heartbeat" placeholder. A plain term on the placeholder
  // label matches zero pings, so availability/duration wrongly render as 0.
  it('matches location-less pings for the Heartbeat placeholder', async () => {
    const { filters, result } = await runHandler(HEARTBEAT_UNMAPPED_LOCATION_LABEL);

    expect(filters).toContainEqual({
      bool: { must_not: { exists: { field: 'observer.geo.name' } } },
    });
    expect(filters).not.toContainEqual({
      term: { 'observer.geo.name': HEARTBEAT_UNMAPPED_LOCATION_LABEL },
    });
    expect(result).toEqual({
      availability: 96,
      medianDuration: 250,
      errorCount: 4,
      totalRuns: 100,
    });
  });
});
