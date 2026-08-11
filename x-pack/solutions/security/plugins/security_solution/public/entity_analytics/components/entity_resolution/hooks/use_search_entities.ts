/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EntityType } from '@kbn/entity-store/public';
import { useEntitiesListQuery } from '../../entity_store/hooks/use_entities_list_query';

interface UseSearchEntitiesParams {
  entityType: EntityType;
  excludeEntityIds: string[];
  searchQuery: string;
  page: number;
  perPage: number;
}

/**
 * Builds a DSL filterQuery that excludes:
 * - Entities already in the resolution group (by entity.id)
 * - Alias entities (have resolved_to set)
 * - Golden entities that have resolution risk scores (meaning they already have aliases)
 *
 * Note: There's a brief timing gap between linking and risk scoring where a golden entity
 * may still appear. The server returns EntityHasAliasesError in that case, shown as a toast.
 */
const buildFilterQuery = (excludeEntityIds: string[], searchQuery: string): string => {
  const mustNot: object[] = [
    { exists: { field: 'entity.relationships.resolution.resolved_to' } },
    { exists: { field: 'entity.relationships.resolution.risk.calculated_score' } },
  ];

  if (excludeEntityIds.length > 0) {
    mustNot.push({ terms: { 'entity.id': excludeEntityIds } });
  }

  const must: object[] = [];
  if (searchQuery) {
    const escaped = searchQuery.replace(/([*?\\])/g, '\\$1');
    const pattern = `*${escaped}*`;
    must.push({
      bool: {
        should: [
          { wildcard: { 'entity.name': { value: pattern, case_insensitive: true } } },
          { wildcard: { 'entity.id': { value: pattern, case_insensitive: true } } },
        ],
      },
    });
  }

  const query: Record<string, unknown> = {
    bool: {
      must_not: mustNot,
      ...(must.length > 0 ? { must } : {}),
    },
  };

  return JSON.stringify(query);
};

export const useSearchEntities = ({
  entityType,
  excludeEntityIds,
  searchQuery,
  page,
  perPage,
}: UseSearchEntitiesParams) => {
  // Stabilize: avoid re-building the query when the array reference changes
  // but the contents are structurally equal (e.g. after group refetch).
  // We derive a sorted JSON string key and parse it back inside useMemo so the
  // callback has no dependency on the unstable array reference itself.
  const excludeIdsKey = JSON.stringify(excludeEntityIds.slice().sort());
  const filterQuery = useMemo(
    () => buildFilterQuery(JSON.parse(excludeIdsKey) as string[], searchQuery),
    [excludeIdsKey, searchQuery]
  );

  return useEntitiesListQuery({
    entityTypes: [entityType],
    filterQuery,
    page,
    perPage,
    skip: false,
  });
};
