/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityGridData } from './use_entity_grid_data';
import {
  getGroupRecordsOptions,
  useResolvedEntityMembers,
  useResolvedEntityTotals,
} from './use_resolved_entity';

jest.mock('./use_entity_grid_data', () => ({ useEntityGridData: jest.fn() }));

const mockGridData = (data: Partial<ReturnType<typeof useEntityGridData>>) =>
  jest.mocked(useEntityGridData).mockReturnValue({
    rows: [],
    total: undefined,
    isFetching: false,
    isEnriching: false,
    ...data,
  } as ReturnType<typeof useEntityGridData>);

describe('useResolvedEntityTotals', () => {
  it("reads the group's row as the grid's resolved rows do, every column over the whole group", () => {
    const groupRow = { 'entity.id': 'host:a', group_size: 2_000, alert_count: 40 };
    mockGridData({ rows: [groupRow] });

    const { result } = renderHook(() => useResolvedEntityTotals('host:a', '7d'));

    expect(result.current).toEqual({ totals: groupRow, isLoading: false });
    expect(useEntityGridData).toHaveBeenCalledWith(
      expect.objectContaining({
        rowsMode: 'resolved',
        entityExpression: 'entity.id == "host:a"',
        pageSize: 1,
        timeRange: '7d',
      })
    );
  });

  it('is loading until the computed columns arrive', () => {
    mockGridData({ rows: [{ 'entity.id': 'host:a' }], isEnriching: true });

    const { result } = renderHook(() => useResolvedEntityTotals('host:a', '7d'));

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useResolvedEntityMembers', () => {
  it("reads the expanded row's records, so it shares their cache, with the group's size", () => {
    const members = [{ 'entity.id': 'host:a' }, { 'entity.id': 'host:a1' }];
    mockGridData({ rows: members, total: 2_000 });

    const { result } = renderHook(() => useResolvedEntityMembers('host:a', '7d'));

    expect(result.current).toEqual({ members, total: 2_000, isLoading: false });
    expect(useEntityGridData).toHaveBeenCalledWith(getGroupRecordsOptions('host:a', '7d', []));
  });
});
