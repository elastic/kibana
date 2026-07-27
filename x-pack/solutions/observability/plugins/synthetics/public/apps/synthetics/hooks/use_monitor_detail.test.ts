/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import { useMonitorDetail } from './use_monitor_detail';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';
import { HEARTBEAT_UNMAPPED_LOCATION_LABEL } from '../../../../common/runtime_types';
import { MONITOR_STATUS_LOOKBACK } from '../../../../common/constants/client_defaults';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useEsSearch: jest.fn().mockReturnValue({ data: undefined, loading: false }),
}));

const useEsSearchMock = observabilitySharedPublic.useEsSearch as jest.Mock;

describe('useMonitorDetail', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses default index pattern when no remoteName is provided', () => {
    renderHook(() => useMonitorDetail('config-123', 'US East'));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: SYNTHETICS_INDEX_PATTERN,
      }),
      ['config-123', 'US East', undefined, undefined],
      expect.any(Object)
    );
  });

  it('uses CCS index pattern when remoteName is provided', () => {
    renderHook(() => useMonitorDetail('config-123', 'US East', 'remote-cluster-1'));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `remote-cluster-1:${SYNTHETICS_INDEX_PATTERN}`,
      }),
      ['config-123', 'US East', 'remote-cluster-1', undefined],
      expect.any(Object)
    );
  });

  it('includes configId and location in the query filters', () => {
    renderHook(() => useMonitorDetail('config-456', 'EU West'));

    const params = useEsSearchMock.mock.calls[0][0];
    const filters = params.query.bool.filter;

    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { config_id: 'config-456' } },
        { term: { 'observer.geo.name': 'EU West' } },
        { exists: { field: 'summary' } },
      ])
    );
  });

  it('filters heartbeat monitors by monitor.id (their pings carry no config_id)', () => {
    renderHook(() => useMonitorDetail('k8s-monitor', 'US East', undefined, 'heartbeat'));

    const params = useEsSearchMock.mock.calls[0][0];
    const filters = params.query.bool.filter;

    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { 'monitor.id': 'k8s-monitor' } },
        { term: { 'observer.geo.name': 'US East' } },
        { exists: { field: 'summary' } },
      ])
    );
    expect(filters).not.toContainEqual({ term: { config_id: 'k8s-monitor' } });
  });

  it('matches location-less pings for a heartbeat monitor on the placeholder location', () => {
    renderHook(() =>
      useMonitorDetail('k8s-monitor', HEARTBEAT_UNMAPPED_LOCATION_LABEL, undefined, 'heartbeat')
    );

    const params = useEsSearchMock.mock.calls[0][0];
    const filters = params.query.bool.filter;

    expect(filters).toContainEqual({
      bool: { must_not: { exists: { field: 'observer.geo.name' } } },
    });
    expect(filters).not.toContainEqual({
      term: { 'observer.geo.name': HEARTBEAT_UNMAPPED_LOCATION_LABEL },
    });
  });

  it('bounds the query by a @timestamp lower bound so it prunes frozen-tier shards', () => {
    renderHook(() => useMonitorDetail('config-456', 'EU West'));

    const params = useEsSearchMock.mock.calls[0][0];
    expect(params.query.bool.filter).toEqual(
      expect.arrayContaining([{ range: { '@timestamp': { gte: MONITOR_STATUS_LOOKBACK } } }])
    );
  });
});
