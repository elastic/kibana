/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';

/**
 * Build a DSL filter matching documents of any of the given entity records, or `undefined` when
 * none of the records carries the identity fields needed to build one.
 *
 * A single-record request's filter is returned as-is. When several records are requested (even if
 * only one yields a filter), each filter is OR'd as a named query (`_name` = `entity.id`) so Elasticsearch reports which record(s) a hit belongs to
 * via `hit.matched_queries`; see {@link getMatchedEntityId}.
 */
export const buildEntitiesFilter = (
  entityType: EntityType,
  entityRecords: Entity[]
): QueryDslQueryContainer | undefined => {
  const definition = getBuiltInEntityDefinition(entityType);
  const filters = entityRecords.flatMap((record) => {
    const filter = euid.dsl.getEuidFilterBasedOnEntityRecord(definition, record);
    return filter ? [{ filter, entityId: record.entity?.id }] : [];
  });

  if (filters.length === 0) {
    return undefined;
  }
  // Genuinely single-record request, return its filter directly.
  if (entityRecords.length === 1) {
    return filters?.[0]?.filter;
  }

  // Multi-record request, return named queries so we can associate hits with the corresponding
  // entity IDs, even when only one record yields a usable filter.
  return {
    bool: {
      should: filters.map(({ filter, entityId }) =>
        entityId ? { bool: { filter: [filter], _name: entityId } } : filter
      ),
      minimum_should_match: 1,
    },
  };
};

/**
 * Pick the entity a hit belongs to from its `matched_queries`, preferring the earliest of
 * `entityIds` (the target entity comes first) when several records matched.
 */
export const getMatchedEntityId = (
  matchedQueries: string[] | Record<string, number> | undefined,
  entityIds: string[]
): string | undefined => {
  if (!matchedQueries) {
    return undefined;
  }
  const matched = new Set(
    Array.isArray(matchedQueries) ? matchedQueries : Object.keys(matchedQueries)
  );
  return entityIds.find((entityId) => matched.has(entityId));
};
