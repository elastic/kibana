/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { EntityFilters, QueryArgs } from '../../entities_grid/common';
import { buildFilterClause, createEsqlRunner } from '../../entities_grid/queries/esql';
import { buildEntityFiltersExpression } from '../../entities_grid/queries/entity_filters';
import {
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
  isFilteringByGroupValue,
} from '../../entities_grid/queries/resolved_entities';
import type { ResolvedEntityFilterOverrides } from '../../entities_grid/queries/resolved_entities';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';

/**
 * The entities index of the tile queries and their entity filter clauses. The tiles count groups,
 * so the filters judge a group by its values (the highest criticality, every source and watchlist
 * of its members, its resolved risk level), as the grid's resolved rows do: the groups that pass
 * differently from their main entity are read once and added or removed by id.
 *
 * Until they are read the index is reported as loading, and when that fails it is reported as
 * missing, with the error, so no tile counts with filters that judge the main entity alone.
 */
export const useTileQueryInputs = (spaceId: string, entityFilters: EntityFilters) => {
  const { data } = useKibana().services;
  const indexQuery = useResolvedLatestEntitiesIndexName(spaceId);
  const indexName = indexQuery.data?.indexName ?? undefined;
  const entityExpression = buildEntityFiltersExpression(entityFilters, 'resolved');

  const overridesArgs: Pick<
    QueryArgs,
    'namespace' | 'concreteEntityIndexName' | 'entityExpression' | 'rowsMode'
  > = {
    namespace: spaceId,
    concreteEntityIndexName: indexName ?? '',
    entityExpression,
    rowsMode: 'resolved',
  };
  const needsOverrides = isFilteringByGroupValue(overridesArgs);

  const overrides = useQuery<ResolvedEntityFilterOverrides, Error>(
    ['tileEntityFilterOverrides', spaceId, indexName, entityExpression],
    ({ signal }) =>
      runWithTileTimeout(signal, (tileSignal) =>
        fetchResolvedEntityFilterOverrides(overridesArgs, createEsqlRunner(data.search, tileSignal))
      ),
    {
      enabled: needsOverrides && Boolean(indexName),
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
      retry: retryUnlessTimedOut,
    }
  );

  const overridesData = needsOverrides ? overrides.data : undefined;
  const entityFilterClauses = useMemo(
    () =>
      buildFilterClause(
        entityExpression && applyResolvedEntityFilterOverrides(entityExpression, overridesData)
      ),
    [entityExpression, overridesData]
  );

  if (!needsOverrides || !indexName) {
    return {
      data: indexQuery.data,
      isLoading: indexQuery.isLoading,
      error: indexQuery.error ?? undefined,
      entityFilterClauses,
    };
  }

  return {
    data: overrides.data ? indexQuery.data : undefined,
    isLoading: overrides.data === undefined && !overrides.isError,
    error: overrides.error ?? undefined,
    entityFilterClauses,
  };
};
