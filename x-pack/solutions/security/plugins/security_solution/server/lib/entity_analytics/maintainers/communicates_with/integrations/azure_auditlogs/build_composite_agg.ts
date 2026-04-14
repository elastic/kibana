/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE } from '../../constants';
import type { CompositeAfterKey, CompositeBucket } from '../../types';
import {
  AZURE_AUDITLOGS_ACTOR_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_TYPE_FIELD,
  AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD,
} from './constants';

/**
 * Paginates through Azure Audit Log documents grouped by actor UPN.
 *
 * The initiated_by actor is not mapped to ECS user.* fields, so we cannot use
 * the shared buildCompositeAggQueryBase. Instead we group by the raw UPN field
 * and provide a matching buildBucketUserFilter below.
 *
 * Includes both User-type targets (user→user) and Device-type targets (user→host).
 */
export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
        { exists: { field: AZURE_AUDITLOGS_ACTOR_UPN_FIELD } },
        {
          bool: {
            should: [
              {
                bool: {
                  filter: [
                    { term: { [AZURE_AUDITLOGS_TARGET_TYPE_FIELD]: 'User' } },
                    { exists: { field: AZURE_AUDITLOGS_TARGET_UPN_FIELD } },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    { term: { [AZURE_AUDITLOGS_TARGET_TYPE_FIELD]: 'Device' } },
                    { exists: { field: AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD } },
                  ],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
  aggs: {
    users: {
      composite: {
        size: COMPOSITE_PAGE_SIZE,
        ...(afterKey ? { after: afterKey } : {}),
        sources: [
          {
            [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: {
              terms: { field: AZURE_AUDITLOGS_ACTOR_UPN_FIELD, missing_bucket: true },
            },
          },
        ],
      },
    },
  },
});

/**
 * Scopes the ES|QL query to the actor UPNs found in the current composite agg page.
 */
export function buildBucketUserFilter(buckets: CompositeBucket[]): QueryDslQueryContainer {
  const upns = buckets
    .map((b) => b.key[AZURE_AUDITLOGS_ACTOR_UPN_FIELD])
    .filter((v): v is string => v != null);

  if (upns.length === 0) {
    return { bool: { must_not: { match_all: {} } } };
  }

  return { terms: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: upns } };
}
