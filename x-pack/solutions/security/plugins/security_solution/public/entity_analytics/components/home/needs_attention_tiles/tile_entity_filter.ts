/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { toList } from '../entities_grid/queries/esql';
import type { RowsMode } from '../entities_grid/common';

/** Cap tile → table IN-list size; ES|QL IN lists and ES terms queries both have practical limits. */
export const MAX_TILE_FILTER_ENTITY_IDS = 1000;

export const getCappedTileEntityIds = (ids: readonly string[]): readonly string[] =>
  ids.length > MAX_TILE_FILTER_ENTITY_IDS ? ids.slice(0, MAX_TILE_FILTER_ENTITY_IDS) : ids;

/** ES|QL condition that keeps the rows of the active tile's entities. */
export const buildTileWhereExpression = (ids: readonly string[], rowsMode: RowsMode): string => {
  // Always constrain when a tile is active — empty list matches nothing so the
  // table stays consistent with a 0-count tile rather than falling back to all entities.
  if (!ids.length) return 'false';
  const list = toList(ids);
  // Tiles emit resolved (effective) ids. Resolved rows: parent rows only.
  // Individual rows: parent + members of those identities.
  return rowsMode === 'individual'
    ? `(entity.id IN (${list}) OR entity.relationships.resolution.resolved_to IN (${list}))`
    : `entity.id IN (${list})`;
};

/** DSL counterpart of the tile ES|QL clause (grouping buckets use this path). */
export const buildTileFilter = (
  ids: readonly string[],
  rowsMode: RowsMode
): QueryDslQueryContainer => {
  if (!ids.length) return { match_none: {} };
  if (rowsMode === 'individual') {
    return {
      bool: {
        should: [
          { terms: { 'entity.id': [...ids] } },
          { terms: { 'entity.relationships.resolution.resolved_to': [...ids] } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  return { terms: { 'entity.id': [...ids] } };
};
