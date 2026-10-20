/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import { useStatusByLocation } from './use_status_by_location';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';
import { MONITOR_STATUS_LOOKBACK } from '../../../../common/constants/client_defaults';
import { MONITOR_STATUS_ENUM } from '../../../../common/constants/monitor_management';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useEsSearch: jest.fn().mockReturnValue({ data: undefined, loading: false }),
}));

jest.mock('../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
}));

const mockUrlParams = jest.fn();
jest.mock('./use_url_params', () => ({
  useGetUrlParams: () => mockUrlParams(),
}));

const mockUseLocations = jest.fn();
jest.mock('./use_locations', () => ({
  useLocations: () => mockUseLocations(),
}));

jest.mock('../components/monitors_page/hooks/use_monitor_health_color', () => ({
  useMonitorHealthColor: () => (status: string) => `color:${status}`,
}));

const useEsSearchMock = observabilitySharedPublic.useEsSearch as jest.Mock;

const usEastLocal = { id: 'us-east', label: 'US East' };
const euWestLocal = { id: 'eu-west', label: 'EU West' };
const remoteOnlyLoc = { id: 'remote-private-1', label: 'Remote Private 1' };

describe('useStatusByLocation', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseLocations.mockReturnValue({ locations: [usEastLocal, euWestLocal] });
    useEsSearchMock.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => jest.clearAllMocks());

  describe('query construction', () => {
    it('queries the local synthetics index pattern when no remoteName is provided', () => {
      renderHook(() => useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] }));

      expect(useEsSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
        expect.arrayContaining(['cfg-1', undefined]),
        expect.any(Object)
      );
    });

    it('queries the CCS-prefixed index when remoteName is in the URL', () => {
      mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

      renderHook(() => useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] }));

      expect(useEsSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
        expect.arrayContaining(['cfg-1', 'remote-a']),
        expect.any(Object)
      );
    });

    it('includes config_id filter and terms aggregation on observer.geo.name', () => {
      renderHook(() =>
        useStatusByLocation({ configId: 'cfg-xyz', monitorLocations: [usEastLocal] })
      );

      const params = useEsSearchMock.mock.calls[0][0];
      expect(params.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { config_id: 'cfg-xyz' } }])
      );
      expect(params.aggs.locations.terms.field).toBe('observer.geo.name');
    });

    it('bounds the query by a @timestamp lower bound so it prunes frozen-tier shards', () => {
      renderHook(() => useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] }));

      const params = useEsSearchMock.mock.calls[0][0];
      expect(params.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { '@timestamp': { gte: MONITOR_STATUS_LOOKBACK } } }])
      );
    });
  });

  describe('status resolution', () => {
    const mockPingsByLocation = (
      buckets: Array<{
        label: string;
        down?: number;
        up?: number;
      }>
    ) => {
      useEsSearchMock.mockReturnValue({
        data: {
          aggregations: {
            locations: {
              buckets: buckets.map((b) => ({
                key: b.label,
                summary: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          observer: { geo: { name: b.label } },
                          summary: { up: b.up ?? 0, down: b.down ?? 0 },
                        },
                      },
                    ],
                  },
                },
              })),
            },
          },
        },
        loading: false,
      });
    };

    it('returns UP when the location has a ping with summary.down === 0', () => {
      mockPingsByLocation([{ label: 'US East', down: 0, up: 1 }]);

      const { result } = renderHook(() =>
        useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] })
      );

      expect(result.current.locations).toEqual([
        {
          id: 'us-east',
          label: 'US East',
          status: MONITOR_STATUS_ENUM.UP,
          color: `color:${MONITOR_STATUS_ENUM.UP}`,
        },
      ]);
    });

    it('returns DOWN when the location has a ping with summary.down > 0', () => {
      mockPingsByLocation([{ label: 'US East', down: 1, up: 0 }]);

      const { result } = renderHook(() =>
        useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] })
      );

      expect(result.current.locations[0].status).toBe(MONITOR_STATUS_ENUM.DOWN);
    });

    it('returns PENDING when no ping bucket matches the location label', () => {
      mockPingsByLocation([{ label: 'EU West', down: 0, up: 1 }]);

      const { result } = renderHook(() =>
        useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] })
      );

      expect(result.current.locations[0].status).toBe(MONITOR_STATUS_ENUM.PENDING);
    });

    it('returns one entry per monitorLocation, preserving order', () => {
      mockPingsByLocation([
        { label: 'US East', down: 0, up: 1 },
        { label: 'EU West', down: 1, up: 0 },
      ]);

      const { result } = renderHook(() =>
        useStatusByLocation({
          configId: 'cfg-1',
          monitorLocations: [usEastLocal, euWestLocal],
        })
      );

      expect(result.current.locations.map((l) => [l.id, l.status])).toEqual([
        ['us-east', MONITOR_STATUS_ENUM.UP],
        ['eu-west', MONITOR_STATUS_ENUM.DOWN],
      ]);
    });
  });

  describe('local-registry fallback', () => {
    it('uses the monitor location entry when the local registry does not know the id', () => {
      // Remote private location whose id is not in the local Kibana registry
      // (typical for remote monitors via CCS).
      mockUseLocations.mockReturnValue({ locations: [usEastLocal] });
      mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

      const { result } = renderHook(() =>
        useStatusByLocation({
          configId: 'cfg-1',
          monitorLocations: [remoteOnlyLoc],
        })
      );

      expect(result.current.locations).toEqual([
        {
          id: 'remote-private-1',
          label: 'Remote Private 1',
          status: MONITOR_STATUS_ENUM.PENDING,
          color: `color:${MONITOR_STATUS_ENUM.PENDING}`,
        },
      ]);
    });

    it('still resolves status when the remote ping label matches the monitor location label', () => {
      mockUseLocations.mockReturnValue({ locations: [] });
      mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });
      useEsSearchMock.mockReturnValue({
        data: {
          aggregations: {
            locations: {
              buckets: [
                {
                  key: 'Remote Private 1',
                  summary: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            observer: { geo: { name: 'Remote Private 1' } },
                            summary: { up: 1, down: 0 },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        loading: false,
      });

      const { result } = renderHook(() =>
        useStatusByLocation({
          configId: 'cfg-1',
          monitorLocations: [remoteOnlyLoc],
        })
      );

      expect(result.current.locations[0].status).toBe(MONITOR_STATUS_ENUM.UP);
    });
  });

  it('exposes loading state from useEsSearch', () => {
    useEsSearchMock.mockReturnValue({ data: undefined, loading: true });

    const { result } = renderHook(() =>
      useStatusByLocation({ configId: 'cfg-1', monitorLocations: [usEastLocal] })
    );

    expect(result.current.loading).toBe(true);
  });
});
