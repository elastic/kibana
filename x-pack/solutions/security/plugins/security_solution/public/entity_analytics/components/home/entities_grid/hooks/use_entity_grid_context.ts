/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type { QueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import type { QueryArgs, RowsMode, SortDir, TimeRange } from '../common';

/** `page`: the grid rows. `children`: the records of expanded groups. */
export type EntityGridKeyScope = 'page' | 'children';

export interface UseEntityGridDataOptions {
  /** The column the rows are sorted by. */
  sortField: string;
  /** The sort order. */
  sortDirection: SortDir;
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
export const getKeyScope = ({
  keyScope = 'page',
}: Pick<UseEntityGridDataOptions, 'keyScope'>): EntityGridKeyScope => keyScope;

const ENTITIES_INDEX_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.entitiesIndexUnavailable',
  {
    defaultMessage:
      'The entities index is not available. Check that the entity store is installed and that you can read its index.',
  }
);

/**
 * What the grid queries read besides their options: the app's services and space, the entity
 * index they join, and the installed security anomaly jobs. The space and the index are `null`
 * until they resolve, and the index stays `null` when there is none to read; no query runs
 * before both are known, and `entitiesIndexError` says why the index is missing or unreadable.
 */
export interface GridContext {
  queryClient: QueryClient;
  searchService: DataPublicPluginStart['search'];
  http: HttpSetup;
  spaceId: string | null;
  concreteEntityIndexName: string | null;
  isEntitiesIndexLoading: boolean;
  entitiesIndexError: Error | undefined;
  anomalyJobIds: readonly string[];
  isAnomalyJobsLoading: boolean;
}

/** The context once its queries can run. */
export type ReadyGridContext = GridContext & { spaceId: string; concreteEntityIndexName: string };

/** The context when the space and the entity index are known, `null` before: no query runs. */
export const getReadyContext = (context: GridContext): ReadyGridContext | null =>
  context.spaceId != null && context.concreteEntityIndexName != null
    ? {
        ...context,
        spaceId: context.spaceId,
        concreteEntityIndexName: context.concreteEntityIndexName,
      }
    : null;

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

export const buildQueryArgs = (
  { spaceId, concreteEntityIndexName, anomalyJobIds }: ReadyGridContext,
  options: UseEntityGridDataOptions
): QueryArgs => ({
  namespace: spaceId,
  timeRange: options.timeRange,
  sort: { field: options.sortField, direction: options.sortDirection },
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
  const spaceId = useSpaceId() ?? null;
  const {
    data: resolvedIndex,
    error: resolveError,
    isLoading: isEntitiesIndexLoading,
  } = useResolvedLatestEntitiesIndexName(spaceId ?? undefined);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;
  // The resolver reports no index for a store that is absent or unreadable as a result, not an error.
  const entitiesIndexError = useMemo(
    () =>
      resolveError ??
      (resolvedIndex && resolvedIndex.indexName === null
        ? new Error(ENTITIES_INDEX_UNAVAILABLE)
        : undefined),
    [resolveError, resolvedIndex]
  );
  const { jobIds: anomalyJobIds, loading: isAnomalyJobsLoading } = useInstalledSecurityJobsIds();

  return useMemo(
    () => ({
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      isEntitiesIndexLoading,
      entitiesIndexError,
      anomalyJobIds,
      isAnomalyJobsLoading,
    }),
    [
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      isEntitiesIndexLoading,
      entitiesIndexError,
      anomalyJobIds,
      isAnomalyJobsLoading,
    ]
  );
};
