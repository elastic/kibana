/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as spaceHook from '../../../../../hooks/use_kibana_space';
import * as paramHook from '../../../hooks/use_url_params';
import * as redux from 'react-redux-v7';
import {
  useMonitorFilters,
  useMonitorIdFilter,
  useOverviewAlertsKuery,
} from './use_monitor_filters';
import { WrappedHelper } from '../../../utils/testing';

const localMonitorIdQuery = (
  queryIds: string[],
  extraFilter: Array<Record<string, unknown>> = []
) => ({
  bool: {
    filter: [{ terms: { 'monitor.id': queryIds } }, ...extraFilter],
    must_not: [{ wildcard: { _index: '*:*' } }],
  },
});

describe('useMonitorFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const spaceSpy = jest.spyOn(spaceHook, 'useKibanaSpace');
  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const selSPy = jest.spyOn(redux, 'useSelector');

  it('should return an empty array when no parameters are provided', () => {
    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should return an empty array for schedules alone (monitor.id scoping now comes from useMonitorIdFilter)', () => {
    spaceSpy.mockReturnValue({} as any);
    paramSpy.mockReturnValue({ schedules: 'daily' } as any);
    selSPy.mockReturnValue({
      status: { allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }] },
    });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should return filters for project IDs', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({ projects: ['project1', 'project2'] } as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([
      { field: 'monitor.project.id', values: ['project1', 'project2'] },
    ]);
  });

  it('should return filters for tags and locations', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({
      tags: ['tag1', 'tag2'],
      locations: ['location1', 'location2'],
    } as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([
      { field: 'tags', values: ['tag1', 'tag2'] },
      { field: 'observer.geo.name', values: ['location1', 'location2'] },
    ]);
  });

  it('should include space filters for alerts', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space1' } } as any);
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([{ field: 'kibana.space_ids', values: ['space1'] }]);
  });

  it('should include space filters for non-alerts', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space2' } } as any);
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([{ field: 'meta.space_id', values: ['space2'] }]);
  });

  it('should not include monitor.id for a status filter (that scoping now comes from useMonitorIdFilter)', () => {
    spaceSpy.mockReturnValue({} as any);
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }],
        downIds: [{ monitorQueryId: 'id2' }],
      },
    });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should still return other active filters alongside a status filter', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({ statusFilter: 'pending', projects: ['projectA'] } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }],
        pendingIds: [{ monitorQueryId: 'id1' }],
      },
    });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([{ field: 'monitor.project.id', values: ['projectA'] }]);
  });

  it('should append the alerts space filter in the schedules/AND-locations branch', () => {
    // That branch used to return only the `monitor.id` filter (now moved to
    // `useMonitorIdFilter`) — for alerts, matching a `monitor.id` value is
    // not itself a space boundary, so omitting the space filter here could
    // scope an alert query across spaces whenever a schedule filter is
    // active.
    spaceSpy.mockReturnValue({ space: { id: 'space1' } } as any);
    paramSpy.mockReturnValue({ schedules: 'daily' } as any);
    selSPy.mockReturnValue({
      status: { allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }] },
    });

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([{ field: 'kibana.space_ids', values: ['space1'] }]);
  });

  it('still applies location filters in the schedules/AND-locations branch', () => {
    // Local saved-object rows group locations under one monitor.id, so dropping
    // the geo filter here would let pings from unselected locations through.
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({
      locations: ['location1'],
      useLogicalAndFor: ['locations'],
    } as any);
    selSPy.mockReturnValue({
      status: { allIds: [{ monitorQueryId: 'id1' }] },
    });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([{ field: 'observer.geo.name', values: ['location1'] }]);
  });

  it('should handle a combination of parameters', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space3' } } as any);
    paramSpy.mockReturnValue({
      projects: ['projectA'],
      tags: ['tagB'],
      locations: ['locationC'],
      monitorTypes: 'http',
    } as any);

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: false }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([
      { field: 'monitor.project.id', values: ['projectA'] },
      { field: 'monitor.type', values: ['http'] },
      { field: 'tags', values: ['tagB'] },
      { field: 'observer.geo.name', values: ['locationC'] },
      { field: 'meta.space_id', values: ['space3'] },
    ]);
  });
});

describe('useMonitorIdFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const selSPy = jest.spyOn(redux, 'useSelector');

  it('returns undefined when no schedules, search, or status filter are active', () => {
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toBeUndefined();
  });

  it('returns a terms query (not KQL-expandable UrlFilter values) for allIds under a schedules filter', () => {
    paramSpy.mockReturnValue({ schedules: 'daily' } as any);
    selSPy.mockReturnValue({
      status: { allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }] },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(localMonitorIdQuery(['id1', 'id2']));
  });

  it('returns a terms query scoped to a status filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }],
        downIds: [{ monitorQueryId: 'id2' }],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(localMonitorIdQuery(['id2']));
  });

  it('intersects the status filter with the allIds-based schedules filter', () => {
    paramSpy.mockReturnValue({ schedules: 'daily', statusFilter: 'up' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }, { monitorQueryId: 'id3' }],
        upIds: [{ monitorQueryId: 'id2' }, { monitorQueryId: 'id3' }, { monitorQueryId: 'id4' }],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    // id4 is up but not in allIds (e.g. excluded by a schedule filter); id1 is
    // in allIds but not up — only the intersection should come through.
    expect(result.current).toEqual(localMonitorIdQuery(['id2', 'id3']));
  });

  it('returns a terms query of allIds when a free-text search is active', () => {
    // `allIds` is already search-filtered by the overview-status API, so this
    // scopes pings and alerts without the ping-only `query_string` that would
    // wipe the annotation layer.
    paramSpy.mockReturnValue({ query: 'checkout' } as any);
    selSPy.mockReturnValue({
      status: { allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id3' }] },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(localMonitorIdQuery(['id1', 'id3']));
  });

  it('intersects a free-text search with a status filter', () => {
    paramSpy.mockReturnValue({ query: 'checkout', statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }, { monitorQueryId: 'id3' }],
        downIds: [{ monitorQueryId: 'id2' }, { monitorQueryId: 'id4' }],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(localMonitorIdQuery(['id2']));
  });

  it('scopes to disabledMonitorQueryIds for the disabled status filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'disabled' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }],
        disabledMonitorQueryIds: ['id2'],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(localMonitorIdQuery(['id2']));
  });

  it('falls back to a non-matching id when the status filter matches nothing', () => {
    paramSpy.mockReturnValue({ statusFilter: 'stale' } as any);
    selSPy.mockReturnValue({ status: { allIds: [{ monitorQueryId: 'id1' }], staleIds: [] } });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    const ids = result.current?.terms?.['monitor.id'] as string[];
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toEqual('');
  });

  it('returns the same non-matching id across renders (not a fresh one each time)', () => {
    // A fresh id per render changes this hook's output identity every render,
    // which callers keying an async-fetch dependency array off that output
    // (e.g. via `JSON.stringify`) would see as a perpetually-changing
    // dependency — refetching, re-rendering, and never settling.
    paramSpy.mockReturnValue({ statusFilter: 'stale' } as any);
    selSPy.mockReturnValue({ status: { allIds: [{ monitorQueryId: 'id1' }], staleIds: [] } });

    const { result, rerender } = renderHook(() => useMonitorIdFilter(), {
      wrapper: WrappedHelper,
    });
    const firstIds = result.current?.terms?.['monitor.id'];
    rerender();

    expect(result.current?.terms?.['monitor.id']).toEqual(firstIds);
  });

  it('scopes a remote-only Down status filter by cluster and location, not a shared monitor.id', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-west',
            locationId: 'us-east-1',
          },
        ],
        downIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
        upIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-west',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({
      bool: {
        filter: [
          { terms: { 'monitor.id': ['shared-id'] } },
          { wildcard: { _index: 'cluster-east:*' } },
          { term: { 'observer.name': 'us-east-1' } },
        ],
      },
    });
  });

  it('keeps a local same-ID clause off remote CCS indices', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          { monitorQueryId: 'shared-id' },
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
        downIds: [
          { monitorQueryId: 'shared-id' },
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [{ terms: { 'monitor.id': ['shared-id'] } }],
              must_not: [{ wildcard: { _index: '*:*' } }],
            },
          },
          {
            bool: {
              filter: [
                { terms: { 'monitor.id': ['shared-id'] } },
                { wildcard: { _index: 'cluster-east:*' } },
                { term: { 'observer.name': 'us-east-1' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('scopes a Heartbeat Down status filter by location, not a shared monitor.id', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          { monitorQueryId: 'hb-1', locationId: 'asia_japan' },
          { monitorQueryId: 'hb-1', locationId: 'europe_germany' },
        ],
        downIds: [{ monitorQueryId: 'hb-1', locationId: 'asia_japan' }],
        upIds: [{ monitorQueryId: 'hb-1', locationId: 'europe_germany' }],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(
      localMonitorIdQuery(['hb-1'], [{ term: { 'observer.name': 'asia_japan' } }])
    );
  });

  it('matches location-less Heartbeat pings via a missing observer.name, not the placeholder id', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'hb-1', locationId: 'heartbeat' }],
        downIds: [{ monitorQueryId: 'hb-1', locationId: 'heartbeat' }],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(
      localMonitorIdQuery(
        ['hb-1'],
        [{ bool: { must_not: { exists: { field: 'observer.name' } } } }]
      )
    );
  });

  it('does not put a remote _index qualifier on the alert identity filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
        downIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter({ forAlerts: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual({
      bool: {
        filter: [
          { terms: { 'monitor.id': ['shared-id'] } },
          { term: { 'observer.name': 'us-east-1' } },
        ],
      },
    });
    expect(JSON.stringify(result.current)).not.toContain('_index');
  });

  it('keeps ping index qualification off alert documents in the shared chart filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        downIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter({ forChart: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      { terms: { 'monitor.id': ['shared-id'] } },
                      { wildcard: { _index: 'cluster-east:*' } },
                      { term: { 'observer.name': 'us-east-1' } },
                    ],
                  },
                },
              ],
              must_not: [{ exists: { field: 'kibana.alert.uuid' } }],
            },
          },
          {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      { terms: { 'monitor.id': ['shared-id'] } },
                      { term: { 'observer.name': 'us-east-1' } },
                    ],
                  },
                },
                { exists: { field: 'kibana.alert.uuid' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('allows a linked-cluster location of a local monitor without excluding every CCS index', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({
      status: {
        downIds: [
          {
            monitorQueryId: 'local-1',
            linkedRemoteLocations: [{ remoteName: 'cluster-east', locationId: 'private-loc' }],
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({
      bool: {
        filter: [
          { terms: { 'monitor.id': ['local-1'] } },
          {
            bool: {
              should: [
                { bool: { must_not: [{ wildcard: { _index: '*:*' } }] } },
                {
                  bool: {
                    filter: [
                      { wildcard: { _index: 'cluster-east:*' } },
                      { term: { 'observer.name': 'private-loc' } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('scopes a remote-cluster selection to the API allIds instead of the full CCS data view', () => {
    paramSpy.mockReturnValue({ remoteNames: ['cluster-east'] } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({
      bool: {
        filter: [
          { terms: { 'monitor.id': ['shared-id'] } },
          { wildcard: { _index: 'cluster-east:*' } },
          { term: { 'observer.name': 'us-east-1' } },
        ],
      },
    });
  });

  it('scopes a search-filtered allIds by cluster and location, not a shared monitor.id', () => {
    paramSpy.mockReturnValue({ query: 'shared' } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-east',
            locationId: 'us-east-1',
          },
          {
            monitorQueryId: 'shared-id',
            remoteName: 'cluster-west',
            locationId: 'us-east-1',
          },
        ],
      },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { terms: { 'monitor.id': ['shared-id'] } },
                { wildcard: { _index: 'cluster-east:*' } },
                { term: { 'observer.name': 'us-east-1' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { terms: { 'monitor.id': ['shared-id'] } },
                { wildcard: { _index: 'cluster-west:*' } },
                { term: { 'observer.name': 'us-east-1' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('useOverviewAlertsKuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const spaceSpy = jest.spyOn(spaceHook, 'useKibanaSpace');
  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const selSPy = jest.spyOn(redux, 'useSelector');

  it('includes lifecycle status, space, and location without expanding monitor ids to KQL', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space1' } } as any);
    paramSpy.mockReturnValue({
      statusFilter: 'down',
      locations: ['Japan'],
    } as any);
    selSPy.mockReturnValue({
      status: {
        allIds: [{ monitorQueryId: 'id1' }, { monitorQueryId: 'id2' }],
        downIds: [{ monitorQueryId: 'id2' }],
      },
    });

    const { result } = renderHook(() => useOverviewAlertsKuery(), { wrapper: WrappedHelper });

    expect(result.current).toEqual(
      'kibana.alert.status: ("active" or "recovered") and observer.geo.name: "Japan" and kibana.space_ids: "space1"'
    );
    expect(result.current).not.toContain('monitor.id');
  });
});
