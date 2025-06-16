/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_PAGE_VALUE: Page = {
  from: 0,
  size: 25,
};

export interface Pagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
}

export interface Page {
  from: number; // current page index, 0-based
  size: number;
}

export interface Paginate<T> {
  _meta: Pagination;
  data: T[];
}

export function paginationToPage(pagination: Pagination): Page {
  return {
    from: pagination.pageIndex * pagination.pageSize,
    size: pagination.pageSize,
  };
}
export function pageToPagination(page: { from: number; size: number; total: number }) {
  // Prevent divide-by-zero-error
  const pageIndex = page.size ? Math.trunc(page.from / page.size) : 0;
  return {
    pageIndex,
    pageSize: page.size,
    totalItemCount: page.total,
  };
}
