/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getEuidSourceFields } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig, CompositeAfterKey, CompositeBucket } from './types';
import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE } from './constants';

// TODO(follow-up): actorEntityType is hardcoded to 'user' — add actorEntityType to
// RelationshipIntegrationConfig to support host→host and service→* relationships.
const USER_IDENTITY_FIELDS = getEuidSourceFields('user').requiresOneOf;

export const buildActorDiscoveryQuery = (
  config: RelationshipIntegrationConfig,
  afterKey: CompositeAfterKey | undefined
): Record<string, unknown> => {
  const actorFields = config.customActor?.fields ?? USER_IDENTITY_FIELDS;

  const baseFilters: QueryDslQueryContainer[] = [
    { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
    euid.dsl.getEuidDocumentsContainsIdFilter('user'),
  ];

  if (config.requireTargetEntityIdExists) {
    baseFilters.push(euid.dsl.getEuidDocumentsContainsIdFilter(config.targetEntityType));
  }

  if (config.compositeAggAdditionalFilters?.length) {
    baseFilters.push(...config.compositeAggAdditionalFilters);
  }

  return {
    size: 0,
    query: { bool: { filter: baseFilters } },
    aggs: {
      users: {
        composite: {
          size: COMPOSITE_PAGE_SIZE,
          ...(afterKey ? { after: afterKey } : {}),
          sources: actorFields.map((field) => ({
            [field]: { terms: { field, missing_bucket: true } },
          })),
        },
      },
    },
  };
};

export const buildActorPageFilter = (
  config: RelationshipIntegrationConfig,
  buckets: CompositeBucket[]
): QueryDslQueryContainer => {
  const actorFields = config.customActor?.fields ?? USER_IDENTITY_FIELDS;

  if (buckets.length === 0) {
    return { bool: { must_not: { match_all: {} } } };
  }

  const valuesByField = new Map<string, Set<string>>();
  for (const bucket of buckets) {
    for (const field of actorFields) {
      const value = bucket.key[field];
      if (value != null) {
        let fieldSet = valuesByField.get(field);
        if (!fieldSet) {
          fieldSet = new Set();
          valuesByField.set(field, fieldSet);
        }
        fieldSet.add(value);
      }
    }
  }

  const should: QueryDslQueryContainer[] = [];
  for (const [field, values] of valuesByField) {
    should.push({ terms: { [field]: Array.from(values) } });
  }

  if (should.length === 0) {
    return { bool: { must_not: { match_all: {} } } };
  }

  return { bool: { should, minimum_should_match: 1 } };
};
