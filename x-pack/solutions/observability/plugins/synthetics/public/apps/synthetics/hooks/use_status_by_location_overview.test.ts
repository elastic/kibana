/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData, OverviewStatusState } from '../../../../common/runtime_types';
import { getConfigStatusByLocation } from './use_status_by_location_overview';

const makeMeta = (
  overrides: Partial<OverviewStatusMetaData> & { configId: string }
): OverviewStatusMetaData =>
  ({
    monitorQueryId: overrides.configId,
    name: overrides.configId,
    schedule: '3',
    tags: [],
    isEnabled: true,
    type: 'http',
    isStatusAlertEnabled: false,
    overallStatus: 'up',
    locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
    ...overrides,
  } as OverviewStatusMetaData);

const makeStatus = (overrides: Partial<OverviewStatusState> = {}): OverviewStatusState =>
  ({
    allMonitorsCount: 0,
    disabledMonitorsCount: 0,
    projectMonitorsCount: 0,
    up: 0,
    down: 0,
    pending: 0,
    disabledCount: 0,
    enabledMonitorQueryIds: [],
    disabledMonitorQueryIds: [],
    allIds: [],
    upConfigs: {},
    downConfigs: {},
    pendingConfigs: {},
    disabledConfigs: {},
    ...overrides,
  } as OverviewStatusState);

describe('getConfigStatusByLocation', () => {
  it('returns pending with configIdByLocation when status is null', () => {
    const result = getConfigStatusByLocation(null, 'cfg1', 'loc1');
    expect(result).toEqual({
      status: 'pending',
      configIdByLocation: 'cfg1-loc1',
    });
  });

  it('finds "up" status via configId key', () => {
    const status = makeStatus({
      upConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'up' }],
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc1');
    expect(result.status).toBe('up');
    expect(result.configIdByLocation).toBe('cfg1-loc1');
  });

  it('finds "down" status via configId key', () => {
    const status = makeStatus({
      downConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          overallStatus: 'down',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'down' }],
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc1');
    expect(result.status).toBe('down');
  });

  it('finds status via composite configId-locationId key', () => {
    const status = makeStatus({
      upConfigs: {
        'cfg1-loc2': makeMeta({
          configId: 'cfg1',
          locations: [{ id: 'loc2', label: 'Loc 2', status: 'up' }],
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc2');
    expect(result.status).toBe('up');
    expect(result.configIdByLocation).toBe('cfg1-loc2');
  });

  it('returns pending when monitor exists but location does not match', () => {
    const status = makeStatus({
      upConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'up' }],
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc_unknown');
    expect(result.status).toBe('pending');
  });

  it('returns pending when configId is not found at all', () => {
    const status = makeStatus({
      upConfigs: {
        other: makeMeta({ configId: 'other' }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc1');
    expect(result.status).toBe('pending');
  });

  it('includes timestamp from matched config', () => {
    const status = makeStatus({
      downConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          overallStatus: 'down',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'down' }],
          timestamp: '2025-05-28T10:00:00Z',
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc1');
    expect(result.timestamp).toBe('2025-05-28T10:00:00Z');
  });

  it('prefers upConfigs over downConfigs when configId exists in both', () => {
    const status = makeStatus({
      upConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'up' }],
        }),
      },
      downConfigs: {
        cfg1: makeMeta({
          configId: 'cfg1',
          overallStatus: 'down',
          locations: [{ id: 'loc1', label: 'Loc 1', status: 'down' }],
        }),
      },
    });
    const result = getConfigStatusByLocation(status, 'cfg1', 'loc1');
    expect(result.status).toBe('up');
  });

  describe('multi-location monitor with separated keys', () => {
    it('resolves correct status per location', () => {
      const status = makeStatus({
        downConfigs: {
          'cfg1-loc1': makeMeta({
            configId: 'cfg1',
            overallStatus: 'down',
            locations: [{ id: 'loc1', label: 'Loc 1', status: 'down' }],
          }),
        },
        upConfigs: {
          'cfg1-loc2': makeMeta({
            configId: 'cfg1',
            locations: [{ id: 'loc2', label: 'Loc 2', status: 'up' }],
          }),
        },
      });

      expect(getConfigStatusByLocation(status, 'cfg1', 'loc1').status).toBe('down');
      expect(getConfigStatusByLocation(status, 'cfg1', 'loc2').status).toBe('up');
    });
  });
});
