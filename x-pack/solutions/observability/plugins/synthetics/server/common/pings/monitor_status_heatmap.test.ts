/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryMonitorHeatmap } from './monitor_status_heatmap';
import { HEARTBEAT_UNMAPPED_LOCATION_LABEL } from '../../../common/runtime_types/heartbeat_monitor';

const runQuery = async (location: string) => {
  const search = jest
    .fn()
    .mockResolvedValue({ body: { aggregations: { heatmap: { buckets: [] } } } });
  await queryMonitorHeatmap({
    // @ts-expect-error partial client for testing
    syntheticsEsClient: { search, heartbeatIndices: 'synthetics-*' },
    from: 'now-24h',
    to: 'now',
    monitorId: 'my-monitor',
    location,
    intervalInMinutes: 60,
  });
  return search.mock.calls[0][0].query.bool.filter;
};

describe('queryMonitorHeatmap', () => {
  afterEach(() => jest.clearAllMocks());

  it('filters by observer.geo.name for a real location', async () => {
    const filters = await runQuery('North America - US East');

    expect(filters).toContainEqual({ term: { 'observer.geo.name': 'North America - US East' } });
  });

  // Regression: autodiscovery/heartbeat pings carry no observer.geo.name and are
  // surfaced under the "Heartbeat" placeholder. A plain term on the placeholder
  // label matches zero pings, so the status heatmap ("Downtime history") rendered
  // empty for those monitors.
  it('matches location-less pings for the Heartbeat placeholder', async () => {
    const filters = await runQuery(HEARTBEAT_UNMAPPED_LOCATION_LABEL);

    expect(filters).toContainEqual({
      bool: { must_not: { exists: { field: 'observer.geo.name' } } },
    });
    expect(filters).not.toContainEqual({
      term: { 'observer.geo.name': HEARTBEAT_UNMAPPED_LOCATION_LABEL },
    });
  });
});
