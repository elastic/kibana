/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paginatedTableUpdatesFromCriteria, resolveTablePaginationState } from './monitors_table';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';

describe('resolveTablePaginationState', () => {
  const items = [{ configId: 'a' }, { configId: 'b' }] as OverviewStatusMetaData[];
  const localPageOfItems = [{ configId: 'a' }] as OverviewStatusMetaData[];
  const localPagination = { pageIndex: 0, pageSize: 10, totalItemCount: 2 };
  const serverStatus = { configs: [{ configId: 'x' }] } as never;
  const pageState = { page: 3, perPage: 20 } as never;

  it('uses the server-paginated total when server pagination is enabled and configs are present', () => {
    const result = resolveTablePaginationState({
      enableServerPagination: true,
      items,
      status: serverStatus,
      total: 45,
      pageState,
      localPageOfItems,
      localPagination,
    });

    expect(result.isPaginated).toBe(true);
    expect(result.pageOfItems).toBe(items);
    expect(result.pagination).toEqual({
      pageIndex: 2,
      pageSize: 20,
      totalItemCount: 45,
      pageSizeOptions: [10, 20, 50, 100],
    });
  });

  // Reproduces the grouped compact-table bug: a per-group `MonitorsTable`
  // (rendered by `GroupGridItem` with only that group's `items`) must never
  // adopt the *global* server pagination, or its footer shows the whole
  // result-set's page count instead of the group's own, and clicking its
  // pager corrupts the shared Redux page state for the ungrouped view.
  it('falls back to local pagination when server pagination is disabled, even if a global paginated status exists', () => {
    const result = resolveTablePaginationState({
      enableServerPagination: false,
      items,
      status: serverStatus,
      total: 45,
      pageState,
      localPageOfItems,
      localPagination,
    });

    expect(result.isPaginated).toBe(false);
    expect(result.pageOfItems).toBe(localPageOfItems);
    expect(result.pagination).toBe(localPagination);
  });

  it('falls back to local pagination when there is no server status yet', () => {
    const result = resolveTablePaginationState({
      enableServerPagination: true,
      items,
      status: null,
      total: undefined,
      pageState,
      localPageOfItems,
      localPagination,
    });

    expect(result.isPaginated).toBe(false);
    expect(result.pageOfItems).toBe(localPageOfItems);
    expect(result.pagination).toBe(localPagination);
  });
});

describe('paginatedTableUpdatesFromCriteria', () => {
  const current = { sortField: 'status' as const, sortOrder: 'asc' as const };

  it('resets to page 1 when the sort column or direction changes', () => {
    const updates = paginatedTableUpdatesFromCriteria(
      {
        page: { index: 2, size: 20 },
        sort: { field: 'name', direction: 'asc' },
      },
      current
    );

    expect(updates.page).toBe(1);
    expect(updates.sortField).toBe('name.keyword');
    expect(updates.sortOrder).toBe('asc');
    expect(updates.perPage).toBe(20);
  });

  it('keeps the requested page when only pagination changes', () => {
    const updates = paginatedTableUpdatesFromCriteria(
      {
        page: { index: 2, size: 20 },
        sort: { field: 'overallStatus', direction: 'asc' },
      },
      current
    );

    expect(updates.page).toBe(3);
    expect(updates.sortField).toBe('status');
    expect(updates.sortOrder).toBe('asc');
  });
});
