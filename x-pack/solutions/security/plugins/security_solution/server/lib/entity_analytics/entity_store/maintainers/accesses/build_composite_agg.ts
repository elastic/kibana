/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE } from './constants';
import type { CompositeAfterKey, CompositeBucket } from './types';

const USER_IDENTITY_FIELDS = euid.getEuidSourceFields('user').requiresOneOf;

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
        { term: { 'event.action': 'log_on' } },
        {
          terms: {
            'process.Ext.session_info.logon_type': ['RemoteInteractive', 'Interactive', 'Network'],
          },
        },
        { term: { 'event.outcome': 'success' } },
        euid.getEuidDslDocumentsContainsIdFilter('user'),
        euid.getEuidDslDocumentsContainsIdFilter('host'),
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
});

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
