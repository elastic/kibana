/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { isDefined } from '../../../../../common/utils/nullable';
import {
  buildTileFilter,
  buildTileWhereExpression,
} from '../needs_attention_tiles/tile_entity_filter';
import { RESOLVED_TO_FIELD } from './common';
import { joinAnd } from './queries/esql';
import type { RowsMode } from './common';
import {
  buildEntityFiltersExpression,
  buildEntityFiltersQuery,
} from './hooks/use_entity_grid_filters';
import type { EntityFilters } from './hooks/use_entity_analytics_url_state';

/**
 * Everything that narrows the entities on the page: the search bar, the filter dropdowns,
 * the active tile and the rows mode. They all filter entity docs; `toEsql` and `toDsl`
 * compile them for the grid and for the grouping aggregations.
 */
export interface ActiveFilters {
  /**
   * Search bar text and filter pills, in both forms. The platform converters build them
   * (KQL, pills and data view rules), so they come in compiled.
   */
  search: { esql?: string; dsl?: ESBoolQuery };
  entityFilters: EntityFilters;
  /** Entities of the active tile, capped; `null` when no tile is active. */
  tileEntityIds: readonly string[] | null;
  rowsMode: RowsMode;
}

export interface ActiveFiltersEsql {
  /** Lucene-pushable search: KQL can't run after a LOOKUP JOIN, so queries place it apart. */
  searchExpression?: string;
  /** Filter dropdowns and the active tile, on entity docs. */
  entityExpression?: string;
}

export const toEsql = ({
  search,
  entityFilters,
  tileEntityIds,
  rowsMode,
}: ActiveFilters): ActiveFiltersEsql => ({
  searchExpression: search.esql,
  entityExpression: joinAnd(
    buildEntityFiltersExpression(entityFilters),
    tileEntityIds == null ? undefined : buildTileWhereExpression(tileEntityIds, rowsMode)
  ),
});

/** The grouping query: every filter, and only target docs for resolved rows. */
export const toDsl = ({
  search,
  entityFilters,
  tileEntityIds,
  rowsMode,
}: ActiveFilters): ESBoolQuery | undefined => {
  const filter: QueryDslQueryContainer[] = [
    search.dsl,
    ...buildEntityFiltersQuery(entityFilters),
    tileEntityIds == null ? undefined : buildTileFilter(tileEntityIds, rowsMode),
  ].filter(isDefined);
  const mustNot = rowsMode === 'resolved' ? [{ exists: { field: RESOLVED_TO_FIELD } }] : [];
  return filter.length || mustNot.length
    ? { bool: { filter, must: [], must_not: mustNot, should: [] } }
    : undefined;
};
