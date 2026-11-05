/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { ALERT_ENTITY_ID } from '../../../../common/field_maps/field_names';
import type { EntityType } from '../../../../common/search_strategy';

/**
 * Counts in-scope alerts that could resolve to an entity of this type but carry no stamped EUID for
 * it in `kibana.alert.entity.id`. Base scoring can page through the stamped field directly only when
 * there are none; otherwise it needs the runtime mapping in getEuidCompositeQuery to derive their
 * EUIDs.
 */
export const getUnstampedAlertsCountQuery = (
  entityType: EntityType,
  filter: QueryDslQueryContainer[],
  index: string
) => ({
  index,
  ignore_unavailable: true,
  // Only zero versus not zero matters.
  terminate_after: 1,
  query: {
    bool: {
      filter: [
        ...filter,
        euid.dsl.getEuidDocumentsContainsIdFilter(getBuiltInEntityDefinition(entityType)),
      ],
      must_not: [{ prefix: { [ALERT_ENTITY_ID]: `${entityType}:` } }],
    },
  },
});

/**
 * Builds a composite aggregation that paginates by entity_id (EUID) read straight from the stamped
 * `kibana.alert.entity.id` field, without a runtime mapping. Only complete when every in-scope alert
 * carries the stamp for this type (see getUnstampedAlertsCountQuery).
 *
 * The field holds one EUID per entity type, so the aggregation also returns other types' EUIDs from
 * the same alerts. Keys sort with their type prefix, so this type's EUIDs are contiguous: paging
 * starts after the bare prefix, and callers stop at the first key without it.
 */
export const getStampedEuidCompositeQuery = (
  entityType: EntityType,
  filter: QueryDslQueryContainer[],
  params: {
    index: string;
    pageSize: number;
    afterKey?: Record<string, string>;
  }
) => ({
  index: params.index,
  size: 0,
  ignore_unavailable: true,
  query: {
    bool: { filter: [...filter, { prefix: { [ALERT_ENTITY_ID]: `${entityType}:` } }] },
  },
  aggs: {
    by_entity_id: {
      composite: {
        size: params.pageSize,
        sources: [{ entity_id: { terms: { field: ALERT_ENTITY_ID } } }],
        after: params.afterKey ?? { entity_id: `${entityType}:` },
      },
    },
  },
});

/**
 * Selects alerts whose stamped EUID for this type falls within the page bounds, so the base scoring
 * query reads only the page's alerts instead of every alert in the window. The query still filters
 * on the entity_id it computes, so this only narrows what it reads. Only valid when every in-scope
 * alert carries the stamp for this type.
 */
export const getStampedEuidRangeFilter = (
  entityType: EntityType,
  bounds: { lower?: string; upper: string }
): QueryDslQueryContainer => ({
  range: {
    [ALERT_ENTITY_ID]: {
      // Without a lower bound, start at the type prefix so other types' EUIDs that sort before it
      // don't match.
      ...(bounds.lower !== undefined ? { gt: bounds.lower } : { gte: `${entityType}:` }),
      lte: bounds.upper,
    },
  },
});
