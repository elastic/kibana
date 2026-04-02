/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getEuidSourceFields, getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE } from '../constants';
import type { CompositeAfterKey, CompositeBucket } from '../types';

const USER_IDENTITY_FIELDS = getEuidSourceFields('user').requiresOneOf;

/**
 * Builds the composite aggregation query structure shared by all integrations.
 * Each integration only provides its own event-specific DSL filters.
 */
export function buildCompositeAggQueryBase(
  integrationFilters: QueryDslQueryContainer[],
  afterKey?: CompositeAfterKey
) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
          ...integrationFilters,
          { term: { 'event.outcome': 'success' } },
          euid.dsl.getEuidDocumentsContainsIdFilter('user'),
          euid.dsl.getEuidDocumentsContainsIdFilter('host'),
        ],
      },
    },
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
}

/**
 * Builds a bool/should DSL filter scoping subsequent queries to the users
 * discovered in a composite aggregation page. Shared by all integrations.
 */
export function buildBucketUserFilter(buckets: CompositeBucket[]): QueryDslQueryContainer {
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

  return {
    bool: {
      should,
      minimum_should_match: 1,
    },
  };
}

/**
 * Builds the access-frequency ES|QL query shared by all integrations.
 * Each integration provides its index pattern and WHERE clause lines.
 */
export function buildAccessEsqlQuery(indexPattern: string, whereClause: string): string {
  const userFieldEvals = getFieldEvaluationsEsql('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const hostIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('host');
  const userEuidEval = euid.esql.getEuidEvaluation('user', { withTypeId: false });
  const hostEuidEval = euid.esql.getEuidEvaluation('host', { withTypeId: false });

  return `SET unmapped_fields="nullify";
FROM ${indexPattern}
| WHERE ${whereClause}
    AND event.outcome == "success"
    AND (${userIdFilter})
    AND (${hostIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userEuidEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = COALESCE(${hostEuidEval}, TO_STRING(host.ip), TO_STRING(host.mac))
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""
| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count >= 4, "accesses_frequently",
    "accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    accesses_frequently   = VALUES(targets) WHERE access_type == "accesses_frequently",
    accesses_infrequently = VALUES(targets) WHERE access_type == "accesses_infrequently"
  BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
