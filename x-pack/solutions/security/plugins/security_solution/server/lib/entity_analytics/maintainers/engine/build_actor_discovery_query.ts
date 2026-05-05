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

/**
 * Builds the page filter that narrows the Step 2 ES|QL query to the actors
 * surfaced by Step 1's composite aggregation.
 *
 * **Tuple-vs-OR semantic — required reading for future maintainers.**
 *
 * Composite-aggregation buckets are tuples over the `actorFields`. With
 * default ECS user fields, the bucket key is something like
 * `(user.name=alice, user.email=null)` or `(user.name=null, user.email=bob@x)`.
 * To re-fetch documents for a page of buckets we'd ideally rebuild the same
 * tuples — but Elasticsearch has no compact "any-of-these-tuples" filter,
 * and writing one bool-`should`-of-bool-`must` per bucket explodes for
 * `COMPOSITE_PAGE_SIZE = 3500`. So this function emits the simpler
 *
 *   `{ user.name IN [alice, ...] OR user.email IN [bob@x, ...] OR ... }`
 *
 * which is a strict superset of the tuples: it also matches a hypothetical
 * doc with `(user.name=alice, user.email=bob@x)` even though no such bucket
 * exists. Step 2 then receives some false-positive actors.
 *
 * **Why that's safe today (the "EUID collapse" invariant).**
 *
 * Step 2 computes `actorUserId = EUID(user.*)` per document and `STATS … BY
 * actorUserId`. The EUID is a *function of a single identity field* (e.g.
 * `user:alice@…` or `user:bob@x@…`), chosen by deterministic precedence
 * across `USER_IDENTITY_FIELDS`. So a false-positive document with both
 * `user.name=alice` and `user.email=bob@x` collapses into either
 * `user:alice@…` (if precedence picks `user.name`) or `user:bob@x@…`,
 * never into a *new* `actorUserId`. Each Step 2 row's `actorUserId`
 * therefore corresponds to some bucket that Step 1 actually saw — the
 * false positive's data joins the right actor's row instead of fabricating
 * an unrelated one.
 *
 * This invariant lives in `@kbn/entity-store`'s EUID helpers (one EUID per
 * doc, single source field). Composite sources that violate it (e.g. a
 * future custom `actorFields` that derives EUID from a *combination* of
 * fields) would corrupt this query — record numbers per actor would drift
 * because the page filter would surface unrelated documents.
 */
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
