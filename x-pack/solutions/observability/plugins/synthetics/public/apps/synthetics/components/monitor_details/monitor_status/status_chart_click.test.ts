/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusChartClickPath } from './status_chart_click';
import type { MonitorStatusTimeBin } from './monitor_status_data';

const failedBin = (overrides: Partial<MonitorStatusTimeBin> = {}): MonitorStatusTimeBin => ({
  start: Date.UTC(2024, 0, 1, 12, 0, 0),
  end: Date.UTC(2024, 0, 1, 12, 30, 0),
  ups: 0,
  downs: 1,
  value: -1,
  ...overrides,
});

describe('getStatusChartClickPath', () => {
  it('returns undefined when the cell has no failures', () => {
    expect(
      getStatusChartClickPath({
        timeBin: failedBin({ downs: 0, stateId: 'state-1' }),
        configId: 'cfg-1',
        locationId: 'loc-1',
      })
    ).toBeUndefined();
  });

  it('returns undefined without a config id', () => {
    expect(
      getStatusChartClickPath({
        timeBin: failedBin({ stateId: 'state-1' }),
        locationId: 'loc-1',
      })
    ).toBeUndefined();
  });

  it('opens error details for the latest failed test in the cell', () => {
    expect(
      getStatusChartClickPath({
        timeBin: failedBin({ stateId: 'state-1' }),
        configId: 'cfg-1',
        locationId: 'loc-1',
        spaceId: 'team-a',
        remoteName: 'cluster-one',
      })
    ).toBe('/monitor/cfg-1/errors/state-1?locationId=loc-1&spaceId=team-a&remoteName=cluster-one');
  });

  it('falls back to the errors tab for the cell time range when state id is missing', () => {
    expect(
      getStatusChartClickPath({
        timeBin: failedBin(),
        configId: 'cfg-1',
        locationId: 'loc-1',
      })
    ).toBe(
      '/monitor/cfg-1/errors?locationId=loc-1&dateRangeStart=2024-01-01T12%3A00%3A00.000Z&dateRangeEnd=2024-01-01T12%3A30%3A00.000Z'
    );
  });
});
