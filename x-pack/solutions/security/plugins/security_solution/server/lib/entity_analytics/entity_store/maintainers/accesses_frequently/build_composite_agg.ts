/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE, USER_IDENTITY_FIELDS } from './constants';
import type { CompositeAfterKey, CompositeBucket } from './types';

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
        { term: { 'event.code': '4624' } },
        { term: { 'event.provider': 'Microsoft-Windows-Security-Auditing' } },
        { term: { 'event.category': 'authentication' } },
        { term: { 'event.action': 'logged-in' } },
        { term: { 'event.outcome': 'success' } },
        {
          terms: {
            'winlog.logon.type': [
              'Interactive',
              'Network',
              'Unlock',
              'RemoteInteractive',
              'CachedInteractive',
            ],
          },
        },
        { exists: { field: 'user.name' } },
        euid.getEuidDslDocumentsContainsIdFilter('user'),
      ],
      must_not: [
        { wildcard: { 'user.name': '*$' } },
        { terms: { 'user.name': ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE'] } },
        { wildcard: { 'user.name': 'UMFD-*' } },
        { wildcard: { 'user.name': 'DWM-*' } },
        { term: { 'winlog.event_data.VirtualAccount': 'Yes' } },
      ],
    },
  },
  aggs: {
    users: {
      composite: {
        size: COMPOSITE_PAGE_SIZE,
        ...(afterKey ? { after: afterKey } : {}),
        sources: [
          { 'user.entity.id': { terms: { field: 'user.entity.id', missing_bucket: true } } },
          { 'user.id': { terms: { field: 'user.id', missing_bucket: true } } },
          { 'user.name': { terms: { field: 'user.name', missing_bucket: true } } },
          { 'user.email': { terms: { field: 'user.email', missing_bucket: true } } },
        ],
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
