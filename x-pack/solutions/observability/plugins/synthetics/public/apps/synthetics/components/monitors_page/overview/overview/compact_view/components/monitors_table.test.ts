/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paginatedTableUpdatesFromCriteria } from './monitors_table';

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
