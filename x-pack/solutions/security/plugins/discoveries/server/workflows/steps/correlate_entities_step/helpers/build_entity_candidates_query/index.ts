/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';

/**
 * Entity types the correlate-entities step derives EUIDs for.
 */
export const CORRELATED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export type CorrelatedEntityType = (typeof CORRELATED_ENTITY_TYPES)[number];

const TERMS_AGG_SIZE = 200;

export const getEuidRuntimeFieldName = (entityType: CorrelatedEntityType): string =>
  `correlate_entities_euid_${entityType}`;

export const getEuidAggName = (entityType: CorrelatedEntityType): string =>
  `unique_${entityType}s_by_euid`;

/**
 * Builds the alerts-index search request body used to derive the distinct
 * user/host/service EUIDs across the alerts that belong to one attack
 * discovery. Mirrors the client-side hook `use_attack_entities_lists.ts`:
 * EUID painless runtime fields + terms aggs with a one-document `top_hits`
 * sample per bucket (used for observable extraction and display values).
 */
export const buildEntityCandidatesQuery = ({
  alertIds,
}: {
  alertIds: string[];
}): estypes.SearchRequest => ({
  query: { ids: { values: alertIds } },
  size: 0,
  runtime_mappings: CORRELATED_ENTITY_TYPES.reduce<estypes.MappingRuntimeFields>(
    (acc, entityType) => ({
      ...acc,
      [getEuidRuntimeFieldName(entityType)]: euid.painless.getEuidRuntimeMapping(
        entityType
      ) as estypes.MappingRuntimeField,
    }),
    {}
  ),
  aggs: CORRELATED_ENTITY_TYPES.reduce<Record<string, estypes.AggregationsAggregationContainer>>(
    (acc, entityType) => ({
      ...acc,
      [getEuidAggName(entityType)]: {
        terms: {
          field: getEuidRuntimeFieldName(entityType),
          size: TERMS_AGG_SIZE,
          min_doc_count: 1,
        },
        aggs: {
          sample: { top_hits: { size: 1, _source: true } },
        },
      },
    }),
    {}
  ),
});
