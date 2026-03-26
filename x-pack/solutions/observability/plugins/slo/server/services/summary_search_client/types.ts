/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Groupings, SLODefinition, SLOId, Summary } from '../../domain/models';

interface SummaryResult {
  sloId: SLOId;
  instanceId: string;
  summary: Summary;
  groupings: Groupings;
  remote?: {
    kibanaUrl: string;
    remoteName: string;
    slo: SLODefinition;
  };
}

type SortField =
  | 'error_budget_consumed'
  | 'error_budget_remaining'
  | 'sli_value'
  | 'status'
  | 'burn_rate_5m'
  | 'burn_rate_1h'
  | 'burn_rate_1d';

interface Sort {
  field: SortField;
  direction: 'asc' | 'desc';
}

type Pagination = CursorPagination | OffsetPagination;

interface CursorPagination {
  searchAfter?: Array<string | number>;
  size: number;
}

function isCursorPagination(pagination: Pagination): pagination is CursorPagination {
  return (pagination as CursorPagination).size !== undefined;
}

interface OffsetPagination {
  page: number;
  perPage: number;
}

type Paginated<T> = CursorPaginated<T> | OffsetPaginated<T>;

interface CursorPaginated<T> {
  total: number;
  searchAfter?: Array<string | number>;
  size: number;
  results: T[];
}

interface OffsetPaginated<T> {
  total: number;
  page: number;
  perPage: number;
  results: T[];
}

interface SummarySearchClient {
  search(
    kqlQuery: string,
    filters: string,
    sort: Sort,
    pagination: Pagination,
    hideStale?: boolean
  ): Promise<Paginated<SummaryResult>>;
}

export type {
  SummaryResult,
  SortField,
  Sort,
  Pagination,
  CursorPagination,
  OffsetPagination as PagePagination,
  Paginated,
  CursorPaginated,
  OffsetPaginated as PagePaginated,
  SummarySearchClient,
};
export { isCursorPagination };
