/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { QueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import type { PageCursor, QueryArgs, Row, RowsMode, SortDir, TimeRange } from '../common';

/** `page`: the grid rows. `children`: the records of expanded groups. */
export type EntityGridKeyScope = 'page' | 'children';

export interface UseEntityGridDataOptions {
  /** The column the rows are sorted by. */
  sortField: string;
  /** The sort order. */
  sortDirection: SortDir;
  /** Rows per load. */
  pageSize: number;
  /** The search bar's predicates (KQL, filter pills, group filters), applied to the entity docs. */
  searchExpression?: string;
  /** Entity doc predicates: the URL entity filters and the entity ids of a tile. */
  entityExpression?: string;
  /** The window the alert, anomaly and risk columns look back over. */
  timeRange: TimeRange;
  /** One row per group (`resolved`) or per entity record (`individual`). */
  rowsMode: RowsMode;
  /** Extra fields the rows keep, for the columns the user adds. */
  keepFields: readonly string[];
  /** Which queries the data belongs to. Defaults to `page`. */
  keyScope?: EntityGridKeyScope;
}

/** The scope of a view's queries; the grid rows (`page`) unless told otherwise. */
export const getKeyScope = ({ keyScope = 'page' }: UseEntityGridDataOptions): EntityGridKeyScope =>
  keyScope;

/** One load of rows, and the cursor of the next one (`null` when there is none). */
export interface RowsBatch {
  rows: Row[];
  nextCursor: PageCursor | null;
}

/**
 * What the grid queries read besides their options: the app's services and space, the entity
 * index they join (`null` until it resolves), and the installed security anomaly jobs.
 */
export interface GridContext {
  queryClient: QueryClient;
  searchService: DataPublicPluginStart['search'];
  http: HttpSetup;
  spaceId: string;
  concreteEntityIndexName: string | null;
  anomalyJobIds: readonly string[];
  isAnomalyJobsLoading: boolean;
}

/** What every query of a view depends on. */
export const getViewKey = (
  { spaceId, concreteEntityIndexName }: GridContext,
  { sortField, searchExpression, entityExpression, timeRange, rowsMode }: UseEntityGridDataOptions
) => ({
  spaceId,
  concreteEntityIndexName,
  sortField,
  searchExpression,
  entityExpression,
  timeRange,
  rowsMode,
});

/** The arguments of the column queries for a view, at a cursor. */
export const buildQueryArgs = (
  { spaceId, anomalyJobIds }: GridContext,
  options: UseEntityGridDataOptions,
  concreteEntityIndexName: string,
  cursor: PageCursor | null
): QueryArgs => ({
  namespace: spaceId,
  timeRange: options.timeRange,
  sort: { field: options.sortField, direction: options.sortDirection },
  cursor,
  pageSize: options.pageSize,
  rowsMode: options.rowsMode,
  concreteEntityIndexName,
  searchExpression: options.searchExpression,
  entityExpression: options.entityExpression,
  keepFields: options.keepFields,
  anomalyJobIds,
});

/** What the grid queries read from the app, see `GridContext`. */
export const useGridContext = (): GridContext => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;
  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;
  const { jobIds: anomalyJobIds, loading: isAnomalyJobsLoading } = useInstalledSecurityJobsIds();

  return useMemo(
    () => ({
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      anomalyJobIds,
      isAnomalyJobsLoading,
    }),
    [
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      anomalyJobIds,
      isAnomalyJobsLoading,
    ]
  );
};
