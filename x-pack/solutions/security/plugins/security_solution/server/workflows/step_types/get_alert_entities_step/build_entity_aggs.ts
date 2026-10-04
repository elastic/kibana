/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { AlertEntityType } from './types';

/** The alert fields a display name is read from; see `nameFromFields`. */
export const NAME_FIELDS = ['host.name', 'user.name', 'service.name'] as const;

export const runtimeFieldName = (entityType: AlertEntityType): string => `entity_${entityType}`;

export const countAggName = (entityType: AlertEntityType): string => `${entityType}_count`;

export const entitiesAggName = (entityType: AlertEntityType): string => `${entityType}_entities`;

export const LATEST_AGG_NAME = 'latest';

/**
 * The runtime fields and aggregations that find the entities of the requested types.
 *
 * Each type's id is derived from the alert by the Entity Store's own Painless generator, called
 * exactly as the Attack Discovery badges call it to open an entity's flyout
 * (`useEntityEuidFromAlerts`), so no Entity Store installation is needed. For an alert it gives
 * the same id detection stamps as `kibana.alert.entity.id`.
 *
 * Entities are ranked by alert count, ties broken by id. Each bucket also returns the fields of
 * its most recent alert, which is where its display name comes from.
 */
export const buildEntityAggs = ({
  entityTypes,
  maxEntities,
}: {
  entityTypes: readonly AlertEntityType[];
  maxEntities: number;
}): {
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
  runtime_mappings: Record<string, estypes.MappingRuntimeField>;
} => ({
  aggs: Object.fromEntries(
    entityTypes.flatMap((entityType) => [
      [
        entitiesAggName(entityType),
        {
          aggs: {
            [LATEST_AGG_NAME]: {
              top_hits: {
                _source: false,
                fields: [...NAME_FIELDS],
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' as const } }],
              },
            },
          },
          terms: {
            field: runtimeFieldName(entityType),
            order: [{ _count: 'desc' as const }, { _key: 'asc' as const }],
            size: maxEntities,
          },
        },
      ],
      [countAggName(entityType), { cardinality: { field: runtimeFieldName(entityType) } }],
    ])
  ),
  runtime_mappings: Object.fromEntries(
    entityTypes.map((entityType) => [
      runtimeFieldName(entityType),
      euid.painless.getEuidRuntimeMapping(entityType),
    ])
  ),
});
