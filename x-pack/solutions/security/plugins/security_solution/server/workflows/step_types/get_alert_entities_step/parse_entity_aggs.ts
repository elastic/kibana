/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LATEST_AGG_NAME, countAggName, entitiesAggName } from './build_entity_aggs';
import { nameFromFields } from './name_from_fields';
import type { AlertEntityType, FoundAlertEntities } from './types';

interface EntityBucket {
  doc_count: number;
  key: string;
  [LATEST_AGG_NAME]?: { hits?: { hits?: Array<{ fields?: Record<string, unknown> }> } };
}

interface EntityAggregations {
  [name: string]: { buckets?: EntityBucket[] } | { value?: number } | undefined;
}

/**
 * Reads one type's entities and distinct count out of the search response's aggregations.
 */
export const parseEntityAggs = ({
  aggregations,
  entityType,
}: {
  aggregations: EntityAggregations | undefined;
  entityType: AlertEntityType;
}): FoundAlertEntities => {
  const buckets =
    (aggregations?.[entitiesAggName(entityType)] as { buckets?: EntityBucket[] } | undefined)
      ?.buckets ?? [];
  const total =
    (aggregations?.[countAggName(entityType)] as { value?: number } | undefined)?.value ?? 0;

  return {
    entities: buckets.map((bucket) => ({
      count: bucket.doc_count,
      id: bucket.key,
      name: nameFromFields({
        entityId: bucket.key,
        entityType,
        fields: bucket[LATEST_AGG_NAME]?.hits?.hits?.[0]?.fields,
      }),
      type: entityType,
    })),
    total,
  };
};
