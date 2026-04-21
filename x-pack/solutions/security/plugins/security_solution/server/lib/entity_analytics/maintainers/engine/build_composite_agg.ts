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

const USER_IDENTITY_FIELDS = getEuidSourceFields('user').requiresOneOf;

/**
 * Builds the composite aggregation query for the given integration config.
 * If buildCompositeAggOverride is provided on the config, delegates to it directly
 * (required for integrations like azure_auditlogs whose actor is not in ECS user.* fields).
 */
export const buildCompositeAgg = (
  config: RelationshipIntegrationConfig,
  afterKey: CompositeAfterKey | undefined
): Record<string, unknown> => {
  if (config.buildCompositeAggOverride) {
    return config.buildCompositeAggOverride(afterKey);
  }

  const baseFilters: QueryDslQueryContainer[] = [
    { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
    ...config.compositeAggFilters,
    euid.dsl.getEuidDocumentsContainsIdFilter('user'),
  ];

  if (config.relationshipType === 'accesses') {
    baseFilters.push({ term: { 'event.outcome': 'success' } });
    baseFilters.push(euid.dsl.getEuidDocumentsContainsIdFilter('host'));
  }

  return {
    size: 0,
    query: { bool: { filter: baseFilters } },
    aggs: {
      users: {
        composite: {
          size: COMPOSITE_PAGE_SIZE,
          ...(afterKey ? { after: afterKey } : {}),
          sources: USER_IDENTITY_FIELDS.map((field) => ({
            [field]: { terms: { field, missing_bucket: true } },
          })),
        },
      },
    },
  };
};

/**
 * Builds the DSL filter that scopes an ES|QL query to the users discovered
 * in a composite aggregation page.
 * If buildBucketFilterOverride is provided on the config, delegates to it directly.
 */
export const buildBucketFilter = (
  config: RelationshipIntegrationConfig,
  buckets: CompositeBucket[]
): QueryDslQueryContainer => {
  if (config.buildBucketFilterOverride) {
    return config.buildBucketFilterOverride(buckets);
  }

  if (buckets.length === 0) {
    return { bool: { must_not: { match_all: {} } } };
  }

  const valuesByField = new Map<string, Set<string>>();
  for (const bucket of buckets) {
    for (const field of USER_IDENTITY_FIELDS) {
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
