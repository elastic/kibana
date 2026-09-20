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
import { useMonitorFilters, useMonitorIdFilter } from './use_monitor_filters';
import { WrappedHelper } from '../../../utils/testing';

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
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'] } });

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
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'], downIds: ['id2'] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should still return other active filters alongside a status filter', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({ statusFilter: 'pending', projects: ['projectA'] } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'], pendingIds: ['id1'] } });

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
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'] } });

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([{ field: 'kibana.space_ids', values: ['space1'] }]);
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

  it('returns undefined when no schedules or status filter are active', () => {
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toBeUndefined();
  });

  it('returns a terms query (not KQL-expandable UrlFilter values) for allIds under a schedules filter', () => {
    paramSpy.mockReturnValue({ schedules: 'daily' } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'] } });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({ terms: { 'monitor.id': ['id1', 'id2'] } });
  });

  it('returns a terms query scoped to a status filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'down' } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'], downIds: ['id2'] } });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({ terms: { 'monitor.id': ['id2'] } });
  });

  it('intersects the status filter with the allIds-based schedules filter', () => {
    paramSpy.mockReturnValue({ schedules: 'daily', statusFilter: 'up' } as any);
    selSPy.mockReturnValue({
      status: { allIds: ['id1', 'id2', 'id3'], upIds: ['id2', 'id3', 'id4'] },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    // id4 is up but not in allIds (e.g. excluded by a schedule filter); id1 is
    // in allIds but not up — only the intersection should come through.
    expect(result.current).toEqual({ terms: { 'monitor.id': ['id2', 'id3'] } });
  });

  it('scopes to disabledMonitorQueryIds for the disabled status filter', () => {
    paramSpy.mockReturnValue({ statusFilter: 'disabled' } as any);
    selSPy.mockReturnValue({
      status: { allIds: ['id1', 'id2'], disabledMonitorQueryIds: ['id2'] },
    });

    const { result } = renderHook(() => useMonitorIdFilter(), { wrapper: WrappedHelper });

    expect(result.current).toEqual({ terms: { 'monitor.id': ['id2'] } });
  });

  it('falls back to a non-matching id when the status filter matches nothing', () => {
    paramSpy.mockReturnValue({ statusFilter: 'stale' } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1'], staleIds: [] } });

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
    selSPy.mockReturnValue({ status: { allIds: ['id1'], staleIds: [] } });

    const { result, rerender } = renderHook(() => useMonitorIdFilter(), {
      wrapper: WrappedHelper,
    });
    const firstIds = result.current?.terms?.['monitor.id'];
    rerender();

    expect(result.current?.terms?.['monitor.id']).toEqual(firstIds);
  });
});
